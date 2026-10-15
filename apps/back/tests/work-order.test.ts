import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createWorkOrderSchema,
  updateWorkOrderSchema,
  listWorkOrdersQuerySchema,
  replaceWorkOrderParamsSchema,
} from "../src/schemas/work-order.js";
import * as service from "../src/services/work-order-service.js";
import * as repository from "../src/repositories/work-order-repository.js";
import type { AuthorizationContext } from "../src/schemas/authorization.js";
const context: AuthorizationContext = {
  userId: "mechanic",
  role: "MECHANIC",
  sessionId: "session",
  issuedAt: 1,
  expiresAt: 901,
};
const body = {
  vehicleId: 2,
  entryDate: "2026-10-17T03:00:00.000Z",
  reportedProblem: " Ruido ",
  items: [{ description: "Inspección", quantity: 1.5, unitPrice: 100 }],
  recommendations: [{ description: "Revisar", status: "ACCEPTED" }],
};
const input = createWorkOrderSchema.parse(body);
const now = new Date(input.entryDate);
const vehicle = {
  id: 2,
  customerId: 1,
  licensePlate: "AA123BB",
  make: "Ford",
  model: "Focus",
  year: null,
  initialOdometer: null,
  odometerUnit: "km" as const,
  isActive: true,
  createdAt: now,
  updatedAt: now,
};
const customer = {
  id: 1,
  mechanicId: "mechanic",
  firstName: "Ana",
  lastName: null,
  email: null,
  phone: null,
  address: null,
  documentNumber: null,
  notes: null,
  isActive: true,
  createdAt: now,
  updatedAt: now,
};
const aggregate = {
  order: {
    id: 3,
    vehicleId: 2,
    entryDate: now,
    exitDate: null as Date | null,
    reportedProblem: "Ruido",
    intakeOdometer: null,
    notes: null,
    diagnosis: null,
    createdAt: now,
    updatedAt: now,
  },
  items: [
    {
      id: 4,
      workOrderId: 3,
      description: "Inspección",
      category: "other" as const,
      quantity: 1.5,
      unitPrice: 100,
      createdAt: now,
      updatedAt: now,
    },
  ],
  recommendations: [
    {
      id: 5,
      workOrderId: 3,
      description: "Revisar",
      reason: "Desgaste",
      status: "accepted" as const,
      priority: "high" as const,
      createdAt: now,
      updatedAt: now,
    },
  ],
};
const doubles = (): NonNullable<Parameters<typeof service.createWorkOrder>[2]> => ({
  ...repository,
  findVehicleById: async () => vehicle,
  findCustomerById: async () => customer,
  findWorkOrderById: async () => aggregate,
  insertWorkOrder: async () => aggregate,
  replaceWorkOrderById: async () => aggregate,
  deleteWorkOrderById: async () => ({ id: 3 }),
  findWorkOrders: async () => ({ rows: [aggregate], total: 101 }),
});
test("creation rejects closed orders, missing model fields and undeclared keys", () => {
  assert.equal(input.reportedProblem, "Ruido");
  for (const invalid of [
    { ...body, exitDate: null },
    { ...body, exitDate: body.entryDate },
    { ...body, reportedProblem: undefined },
    { ...body, reportedProblem: " " },
    { ...body, isActive: true },
    { ...body, entryDate: "2026-02-30T03:00:00Z" },
    { ...body, entryDate: "2026-10-17" },
  ])
    assert.equal(createWorkOrderSchema.safeParse(invalid).success, false);
});
test("children enforce finite positive quantity, integer price, enums and immutable identifiers", () => {
  for (const fields of [
    { quantity: 0 },
    { quantity: Infinity },
    { quantity: NaN },
    { quantity: 1e-50 },
    { unitPrice: 1.5 },
    { unitPrice: -1 },
    { unitPrice: 2147483648 },
    { id: 5 },
    { workOrderId: 3 },
    { category: "invalid" },
  ])
    assert.equal(
      createWorkOrderSchema.safeParse({ ...body, items: [{ ...body.items[0], ...fields }] })
        .success,
      false,
    );
  assert.equal(
    createWorkOrderSchema.safeParse({
      ...body,
      recommendations: [{ description: "x", status: "accepted" }],
    }).success,
    false,
  );
  assert.equal(
    createWorkOrderSchema.safeParse({ ...body, items: [], recommendations: [] }).success,
    true,
  );
});
test("replacement validates closing dates, reopening and immutable vehicle", () => {
  const editable = { ...body };
  Reflect.deleteProperty(editable, "vehicleId");
  for (const exitDate of [null, body.entryDate, "2026-10-18T03:00:00Z"])
    assert.ok(updateWorkOrderSchema.safeParse({ ...editable, exitDate }).success);
  assert.equal(
    updateWorkOrderSchema.safeParse({ ...editable, exitDate: "2026-10-16T03:00:00Z" }).success,
    false,
  );
  assert.equal(updateWorkOrderSchema.safeParse({ ...body, exitDate: null }).success, false);
  assert.equal(
    replaceWorkOrderParamsSchema.safeParse({ vehicleId: "2", workOrderId: "0" }).success,
    false,
  );
});
test("pagination rejects unknown/repeated/unsafe values and supports closed filter", () => {
  assert.deepEqual(listWorkOrdersQuerySchema.parse({}), {
    page: 1,
    pageSize: 10,
    withEndDate: false,
  });
  assert.equal(listWorkOrdersQuerySchema.parse({ withEndDate: "true" }).withEndDate, true);
  for (const query of [
    { page: "0" },
    { pageSize: "101" },
    { page: ["1", "2"] },
    { page: "9007199254740991", pageSize: "100" },
    { other: "x" },
  ])
    assert.equal(listWorkOrdersQuerySchema.safeParse(query).success, false);
});
test("creation and detail map child states explicitly without generating items", async () => {
  const result = await service.createWorkOrder(context, input, doubles());
  assert.equal(result?.exitDate, null);
  assert.equal(result?.recommendations[0]?.status, "ACCEPTED");
  assert.equal(result?.recommendations[0]?.reason, "Desgaste");
  assert.equal(result?.items.length, 1);
  assert.equal((await service.getWorkOrderById(context, 3, doubles()))?.entryDate, body.entryDate);
});
test("all operations reject inactive/foreign parents, including GOD archive access", async () => {
  const fields = { ...body };
  Reflect.deleteProperty(fields, "vehicleId");
  const update = updateWorkOrderSchema.parse({ ...fields, exitDate: null });
  for (const role of ["GOD", "MECHANIC"] as const) {
    for (const kind of ["vehicle", "customer", ...(role === "MECHANIC" ? ["foreign"] : [])]) {
      const deps = doubles();
      deps.findVehicleById = async () => ({ ...vehicle, isActive: kind !== "vehicle" });
      deps.findCustomerById = async () => ({
        ...customer,
        isActive: kind !== "customer",
        mechanicId: kind === "foreign" ? "other" : "mechanic",
      });
      deps.insertWorkOrder = deps.replaceWorkOrderById = async () => {
        throw new Error("unauthorized write");
      };
      deps.deleteWorkOrderById = async () => {
        throw new Error("unauthorized delete");
      };
      const auth = { ...context, role };
      assert.equal(await service.createWorkOrder(auth, input, deps), null);
      assert.equal(await service.getWorkOrderById(auth, 3, deps), null);
      assert.equal(await service.updateWorkOrder(auth, 2, 3, update, deps), null);
      assert.equal(await service.deleteWorkOrder(auth, 3, deps), false);
      assert.equal(
        await service.listWorkOrders(auth, 2, listWorkOrdersQuerySchema.parse({}), deps),
        null,
      );
    }
  }
});
test("GOD can operate another mechanic's active tree; pagination is accurate", async () => {
  const deps = doubles();
  deps.findCustomerById = async () => ({ ...customer, mechanicId: "other" });
  assert.ok(await service.createWorkOrder({ ...context, role: "GOD" }, input, deps));
  const result = await service.listWorkOrders(
    { ...context, role: "GOD" },
    2,
    listWorkOrdersQuerySchema.parse({ page: "2", pageSize: "100" }),
    deps,
  );
  assert.deepEqual(result?.meta, {
    page: 2,
    pageSize: 100,
    total: 101,
    totalPages: 2,
    hasNextPage: false,
    hasPreviousPage: true,
  });
});
test("closed orders can be edited/reopened; mismatching vehicle never writes; delete propagates", async () => {
  const deps = doubles();
  deps.findWorkOrderById = async () => ({
    ...aggregate,
    order: { ...aggregate.order, exitDate: now },
  });
  const fields = { ...body };
  Reflect.deleteProperty(fields, "vehicleId");
  const update = updateWorkOrderSchema.parse({ ...fields, exitDate: null });
  let writes = 0;
  deps.replaceWorkOrderById = async (_context, _vehicleId, _id, data) => {
    writes++;
    return { ...aggregate, order: { ...aggregate.order, ...data } };
  };
  assert.equal(await service.updateWorkOrder(context, 99, 3, update, deps), null);
  assert.equal(writes, 0);
  assert.equal((await service.updateWorkOrder(context, 2, 3, update, deps))?.exitDate, null);
  assert.equal(writes, 1);
  assert.ok(await service.deleteWorkOrder(context, 3, deps));
  deps.deleteWorkOrderById = async () => undefined;
  assert.equal(await service.deleteWorkOrder(context, 3, deps), false);
});
