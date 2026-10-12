import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createVehicleSchema,
  updateVehicleSchema,
  archiveVehicleSchema,
  listVehiclesQuerySchema,
  vehicleByIdParamsSchema,
} from "../src/schemas/vehicle.js";
import {
  createVehicle,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  listVehicles,
} from "../src/services/vehicle-service.js";
import * as repository from "../src/repositories/vehicle-repository.js";
import { errorMiddleware } from "../src/middlewares/error-middleware.js";
import type { AuthorizationContext } from "../src/schemas/authorization.js";
const context: AuthorizationContext = {
  userId: "mechanic",
  role: "MECHANIC",
  sessionId: "session",
  issuedAt: 1,
  expiresAt: 901,
};
const input = {
  customerId: 1,
  licensePlate: " ab123cd ",
  make: "Ford",
  model: "Focus",
  odometerUnit: "km" as const,
};
const vehicle = {
  ...input,
  id: 7,
  year: null,
  initialOdometer: null,
  isActive: true,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};
const customer = {
  id: 1,
  mechanicId: context.userId,
  firstName: "Ana",
  lastName: null,
  email: null,
  phone: null,
  address: null,
  documentNumber: null,
  notes: null,
  isActive: true,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};
const doubles = () => ({
  ...repository,
  findVehicleById: async () => vehicle,
  findCustomerById: async () => customer,
  insertVehicle: async () => vehicle,
  updateVehicleById: async () => vehicle,
  deleteVehicleById: async () => ({ id: 7 }),
  findVehicles: async () => ({ rows: [vehicle], total: 101 }),
});
test("vehicle schemas enforce model fields, normalization and immutable parent", () => {
  assert.equal(createVehicleSchema.parse(input).licensePlate, "AB123CD");
  const editable = {
    licensePlate: input.licensePlate,
    make: input.make,
    model: input.model,
    odometerUnit: input.odometerUnit,
  };
  assert.ok(updateVehicleSchema.safeParse(editable).success);
  for (const bad of [
    { ...input, customerId: 0 },
    { ...input, licensePlate: " " },
    { ...input, make: " " },
    { ...input, model: "" },
    { ...input, year: 1885 },
    { ...input, year: 2020.5 },
    { ...input, initialOdometer: -1 },
    { ...input, initialOdometer: Infinity },
    { ...input, initialOdometer: 1.5 },
    { ...input, initialOdometer: 2147483648 },
    { ...input, odometerUnit: "m" },
    { ...input, isActive: false },
  ])
    assert.equal(createVehicleSchema.safeParse(bad).success, false);
  for (const bad of [input, { ...editable, id: 7 }, { ...editable, isActive: true }, {}])
    assert.equal(updateVehicleSchema.safeParse(bad).success, false);
  assert.equal(archiveVehicleSchema.safeParse({ isActive: "false" }).success, false);
  assert.equal(archiveVehicleSchema.safeParse({ isActive: true, customerId: 1 }).success, false);
});
test("vehicle pagination rejects repeated/unknown parameters and unsafe IDs/offsets", () => {
  assert.deepEqual(listVehiclesQuerySchema.parse({}), {
    page: 1,
    pageSize: 10,
    includeArchived: false,
  });
  for (const query of [
    { page: ["1", "2"] },
    { pageSize: "101" },
    { extra: "x" },
    { page: "9007199254740991", pageSize: "100" },
    { customerId: "0" },
  ])
    assert.equal(listVehiclesQuerySchema.safeParse(query).success, false);
  assert.equal(vehicleByIdParamsSchema.safeParse({ vehicleId: "2147483648" }).success, false);
});
test("every vehicle operation denies foreign/inactive parents, including GOD on inactive parents", async () => {
  for (const actor of [context, { ...context, role: "GOD" as const }]) {
    for (const parent of [
      undefined,
      { ...customer, isActive: false },
      ...(actor.role === "MECHANIC" ? [{ ...customer, mechanicId: "other" }] : []),
    ]) {
      const deps = {
        ...doubles(),
        findCustomerById: async () => parent,
        insertVehicle: async () => assert.fail("write"),
        updateVehicleById: async () => assert.fail("write"),
        deleteVehicleById: async () => assert.fail("delete"),
      };
      assert.equal(await createVehicle(actor, input, deps), null);
      assert.equal(await getVehicleById(actor, 7, deps), null);
      assert.equal(await updateVehicle(actor, 7, { isActive: true }, deps), null);
      assert.equal(await deleteVehicle(actor, 7, deps), false);
    }
  }
});
test("authorized CRUD, archive administration and pagination map public data", async () => {
  for (const actor of [context, { ...context, role: "GOD" as const }]) {
    const deps = doubles();
    assert.equal((await createVehicle(actor, input, deps))?.createdAt, "1970-01-01T00:00:00.000Z");
    for (const isActive of [false, true]) {
      assert.equal(
        (
          await updateVehicle(
            actor,
            7,
            { isActive },
            {
              ...deps,
              updateVehicleById: async (_ctx, _id, value) => {
                assert.deepEqual(value, { isActive });
                return { ...vehicle, isActive };
              },
            },
          )
        )?.isActive,
        isActive,
      );
    }
    assert.equal(
      (
        await getVehicleById(actor, 7, {
          ...deps,
          findVehicleById: async () => ({ ...vehicle, isActive: false }),
        })
      )?.isActive,
      false,
    );
    assert.equal(await deleteVehicle(actor, 7, deps), true);
    const page = await listVehicles(
      actor,
      { page: 1, pageSize: 100, includeArchived: false },
      deps,
    );
    assert.equal(page.meta.totalPages, 2);
    assert.equal(page.meta.hasNextPage, true);
  }
  const missing = { ...doubles(), findVehicleById: async () => undefined };
  assert.equal(await getVehicleById(context, 7, missing), null);
  assert.equal(await deleteVehicle(context, 7, missing), false);
});
test("database plate uniqueness and restrictive order FK produce sanitized 409", () => {
  for (const code of ["23505", "23503"]) {
    let status = 0;
    let body: unknown;
    const response = {
      headersSent: false,
      setHeader() {},
      status(value: number) {
        status = value;
        return this;
      },
      json(value: unknown) {
        body = value;
      },
    };
    errorMiddleware(
      { cause: { code, message: "private database values" } },
      {} as never,
      response as never,
      () => assert.fail("next"),
    );
    assert.equal(status, 409);
    assert.deepEqual(body, { error: "Record conflicts with existing data or related records." });
  }
});

test("PUT clears omitted nullable fields and missing writes remain missing", async () => {
  const deps = doubles();
  const { licensePlate, make, model, odometerUnit } = input;
  const editable = { licensePlate, make, model, odometerUnit };
  await updateVehicle(context, 7, editable, {
    ...deps,
    updateVehicleById: async (_ctx, _id, value) => {
      assert.deepEqual(value, { ...editable, year: null, initialOdometer: null });
      return vehicle;
    },
  });
  assert.equal(
    await createVehicle(context, input, { ...deps, insertVehicle: async () => undefined }),
    null,
  );
  assert.equal(
    await updateVehicle(context, 7, editable, {
      ...deps,
      updateVehicleById: async () => undefined,
    }),
    null,
  );
  assert.equal(
    await deleteVehicle(context, 7, { ...deps, deleteVehicleById: async () => undefined }),
    false,
  );
  const empty = await listVehicles(
    context,
    { page: 3, pageSize: 100, includeArchived: true },
    { ...deps, findVehicles: async () => ({ rows: [], total: 0 }) },
  );
  assert.deepEqual(empty.data, []);
  assert.equal(empty.meta.totalPages, 0);
  assert.equal(empty.meta.hasNextPage, false);
});

test("duplicate plate and order dependency errors reach central error handling", async () => {
  const deps = doubles();
  const conflict = Object.assign(new Error("conflict"), { code: "23505" });
  await assert.rejects(
    createVehicle(context, input, {
      ...deps,
      insertVehicle: async () => {
        throw conflict;
      },
    }),
    (error) => error === conflict,
  );
  await assert.rejects(
    deleteVehicle(context, 7, {
      ...deps,
      deleteVehicleById: async () => {
        throw Object.assign(new Error("related orders"), { code: "23503" });
      },
    }),
    { code: "23503" },
  );
});

test("vehicle controllers reject malformed HTTP inputs before accessing services", async () => {
  const controllers = await import("../src/controllers/vehicle-controller.js");
  const requests = [
    [controllers.listVehiclesController, { query: { page: ["1", "2"] } }],
    [controllers.vehicleByIdController, { params: { vehicleId: "-1" } }],
    [controllers.createVehicleController, { body: { ...input, createdAt: "2026-01-01" } }],
    [controllers.updateVehicleController, { params: { vehicleId: "7" }, body: input }],
    [
      controllers.archiveVehicleController,
      { params: { vehicleId: "7" }, body: { isActive: true, customerId: 1 } },
    ],
    [controllers.deleteVehicleController, { params: { vehicleId: "0" } }],
  ] as const;
  for (const [handler, request] of requests) {
    let status = 0;
    let body: unknown;
    const response = {
      locals: { authorization: context },
      status(value: number) {
        status = value;
        return this;
      },
      json(value: unknown) {
        body = value;
      },
    };
    await handler(request as never, response as never, () => assert.fail("next"));
    assert.equal(status, 400);
    assert.ok(body && typeof body === "object" && "error" in body);
  }
});
