import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { build } from "esbuild";
import { createRequire } from "node:module";
import {
  canChooseMechanic,
  canReadCustomer,
  metadataFromVerifiedToken,
  type AuthorizationContext,
} from "../src/schemas/authorization.js";
import {
  createCustomerSchema,
  resetCustomerPasswordSchema,
  updateCustomerSchema,
} from "../src/schemas/customer.js";
import { restrictCustomerAccess } from "../src/middlewares/auth-middleware.js";
import { resetCustomerPassword } from "../src/services/customer-service.js";
import {
  listMyVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
} from "../src/services/vehicle-service.js";
import { getWorkOrderById, listWorkOrders } from "../src/services/work-order-service.js";
import * as vehicleRepository from "../src/repositories/vehicle-repository.js";
import * as orderRepository from "../src/repositories/work-order-repository.js";
import { myVehiclesController } from "../src/controllers/vehicle-controller.js";

const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const customerUuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const context: AuthorizationContext = {
  userId,
  customerId: customerUuid,
  role: "USER",
  sessionId: userId,
  issuedAt: 1,
  expiresAt: 901,
};
const customer = {
  id: 1,
  uuid: customerUuid,
  userId,
  mechanicId: "mechanic",
  firstName: "Ana",
  lastName: null,
  email: "ana@example.com",
  phone: null,
  address: null,
  documentNumber: null,
  notes: null,
  isActive: true,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};
const vehicle = {
  id: 7,
  customerId: 1,
  licensePlate: "AA123BB",
  make: "Ford",
  model: "Focus",
  year: null,
  initialOdometer: null,
  odometerUnit: "km" as const,
  isActive: true,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};
const order = {
  id: 9,
  vehicleId: 7,
  entryDate: new Date(0),
  exitDate: null,
  reportedProblem: "Ruido",
  intakeOdometer: null,
  notes: "Nota",
  diagnosis: "Diagnóstico",
  createdAt: new Date(0),
  updatedAt: new Date(0),
};
const recommendations = (["pending", "accepted", "rejected", null] as const).map((status, i) => ({
  id: i + 1,
  workOrderId: 9,
  description: `Recomendación ${i}`,
  reason: "Motivo",
  status,
  priority: "low" as const,
  createdAt: new Date(0),
  updatedAt: new Date(0),
}));
const aggregate = { order, vehicle, customer, items: [], recommendations };
const res = () => ({
  locals: { authorization: context },
  statusCode: 200,
  body: undefined as unknown,
  status(code: number) {
    this.statusCode = code;
    return this;
  },
  json(body: unknown) {
    this.body = body;
    return this;
  },
});

test("customer account inputs require normalized email/password and reject immutable/privilege fields", () => {
  const input = { firstName: "Ana", email: " ANA@EXAMPLE.COM ", password: "123qweASD" };
  assert.equal(createCustomerSchema.parse(input).email, "ana@example.com");
  for (const body of [
    { firstName: "Ana" },
    { ...input, password: "short" },
    { ...input, password: "á".repeat(37) },
    { ...input, userId },
    { ...input, uuid: customerUuid },
    { ...input, role: "GOD" },
  ])
    assert.equal(createCustomerSchema.safeParse(body).success, false);
  for (const body of [
    { email: input.email },
    { password: input.password },
    { uuid: customerUuid },
    { userId },
  ])
    assert.equal(updateCustomerSchema.safeParse(body).success, false);
  assert.equal(
    resetCustomerPasswordSchema.safeParse({ password: "123qweASD", userId }).success,
    false,
  );
});

test("signed metadata requires application role and explicit UUID/null without trusting user metadata", () => {
  const token = (body: unknown) => `h.${Buffer.from(JSON.stringify(body)).toString("base64url")}.s`;
  for (const body of [
    {},
    { user_metadata: { user_role: "USER", customerId: customerUuid } },
    { app_metadata: { user_role: "USER", customerId: 1 } },
    { app_metadata: { user_role: "GOD" } },
  ])
    assert.equal(metadataFromVerifiedToken(token(body)), null);
  assert.deepEqual(
    metadataFromVerifiedToken(
      token({ app_metadata: { user_role: "USER", customerId: customerUuid } }),
    ),
    { user_role: "USER", customerId: customerUuid },
  );
  assert.deepEqual(
    metadataFromVerifiedToken(token({ app_metadata: { user_role: "MECHANIC", customerId: null } })),
    { user_role: "MECHANIC", customerId: null },
  );
});

test("customer ownership requires both Auth identity and UUID, and never grants mechanic selection", () => {
  assert.equal(canReadCustomer(context, customer), true);
  for (const changed of [
    { ...customer, userId: "foreign" },
    { ...customer, uuid: userId },
    { ...customer, isActive: false },
  ])
    assert.equal(canReadCustomer(context, changed), false);
  assert.equal(canChooseMechanic(context), false);
});

test("HTTP customer access only allows own-resource read routes and logout", async () => {
  for (const [method, path, allowed] of [
    ["GET", "/myvehicles", true],
    ["GET", "/vehicles/7", true],
    ["GET", "/vehicles/7/work-orders", true],
    ["GET", "/work-orders/9", true],
    ["GET", "/auth/me", true],
    ["POST", "/logout", true],
    ["GET", "/customers", false],
    ["GET", "/vehicles", false],
    ["GET", "/finances", false],
    ["POST", "/budgets/pdf", false],
    ["PATCH", "/vehicles/7/archive", false],
    ["PUT", "/vehicles/7", false],
    ["DELETE", "/work-orders/9", false],
    ["POST", "/customers/1/password", false],
  ] as const) {
    const response = res();
    let next = false;
    await restrictCustomerAccess({ method, path } as never, response as never, () => {
      next = true;
    });
    assert.equal(next, allowed, `${method} ${path}`);
    if (!allowed) assert.equal(response.statusCode, 403);
  }
});

test("myvehicles returns the complete mapped collection and rejects other roles without persistence", async () => {
  const result = await listMyVehicles(context, async (identity) => {
    assert.equal(identity.customerId, customerUuid);
    return Array.from({ length: 137 }, (_, i) => ({ vehicle: { ...vehicle, id: i + 1 } }));
  });
  assert.equal(result?.data.length, 137);
  assert.equal(result?.data[0]?.createdAt, new Date(0).toISOString());
  for (const role of ["GOD", "MECHANIC"] as const)
    assert.equal(
      await listMyVehicles({ ...context, role }, async () => assert.fail("Persistence forbidden")),
      null,
    );
  assert.equal(
    await listMyVehicles({ ...context, customerId: null }, async () =>
      assert.fail("Persistence forbidden"),
    ),
    null,
  );
  assert.deepEqual(await listMyVehicles(context, async () => []), { data: [] });
});

test("myvehicles rejects query/body and noncustomer roles before reading persistence", async () => {
  for (const request of [
    { query: { customerId: userId }, get: () => undefined },
    { query: {}, get: (header: string) => (header === "content-length" ? "2" : undefined) },
    {
      query: {},
      get: (header: string) => (header === "transfer-encoding" ? "chunked" : undefined),
    },
  ]) {
    const response = res();
    await myVehiclesController(request as never, response as never, () => assert.fail());
    assert.equal(response.statusCode, 400);
  }
  const response = res();
  response.locals.authorization = { ...context, role: "GOD" };
  await myVehiclesController({ query: {}, get: () => undefined } as never, response as never, () =>
    assert.fail(),
  );
  assert.equal(response.statusCode, 403);
});

test("customer vehicle details reject foreign, archived and mismatched links; mutations never persist", async () => {
  for (const row of [
    { vehicle, customer },
    { vehicle, customer: { ...customer, userId: "foreign" } },
    { vehicle: { ...vehicle, isActive: false }, customer },
    { vehicle, customer: { ...customer, uuid: userId } },
  ]) {
    const result = await getVehicleById(context, 7, {
      ...vehicleRepository,
      findVehicleDetailById: async () => row,
      findCustomerById: async () => row.customer,
    });
    assert.equal(
      result !== null,
      row.customer.userId === userId && row.customer.uuid === customerUuid && row.vehicle.isActive,
    );
  }
  const deps = {
    ...vehicleRepository,
    findCustomerById: async () => customer,
    findVehicleDetailById: async () => ({ vehicle, customer }),
    updateVehicleById: async () => assert.fail("No mutation"),
    deleteVehicleById: async () => assert.fail("No mutation"),
  };
  assert.equal(await updateVehicle(context, 7, { isActive: false }, deps), null);
  assert.equal(await deleteVehicle(context, 7, deps), false);
});

test("own order detail/list filter only REJECTED for USER while keeping all fields and workshop visibility", async () => {
  const deps = {
    ...orderRepository,
    findVehicleById: async () => vehicle,
    findCustomerById: async () => customer,
    findWorkOrderById: async () => aggregate,
    findWorkOrders: async () => ({ rows: [aggregate], total: 1 }),
  };
  const detail = await getWorkOrderById(context, 9, deps);
  assert.deepEqual(
    detail?.recommendations.map((r) => r.status),
    ["PENDING", "ACCEPTED", null],
  );
  assert.equal(detail?.notes, order.notes);
  assert.equal(detail?.diagnosis, order.diagnosis);
  const list = await listWorkOrders(
    context,
    7,
    { page: 1, pageSize: 10, withEndDate: false },
    deps,
  );
  assert.equal(list?.data[0]?.recommendations.length, 3);
  assert.equal(
    (await getWorkOrderById({ ...context, role: "GOD" }, 9, deps))?.recommendations.length,
    4,
  );
  assert.equal(await getWorkOrderById({ ...context, customerId: userId }, 9, deps), null);
});

test("password reset is only for the mechanic; result preserves not-found and provider-free failures", async () => {
  for (const role of ["USER", "GOD"] as const)
    assert.deepEqual(
      await resetCustomerPassword({ ...context, role }, 1, "123qweASD", async () =>
        assert.fail("No reset"),
      ),
      { outcome: "forbidden" },
    );
  const mechanic = { ...context, userId: "mechanic", role: "MECHANIC" as const, customerId: null };
  assert.deepEqual(
    await resetCustomerPassword(mechanic, 1, "123qweASD", async (identity, id, password) => {
      assert.equal(identity, mechanic);
      assert.equal(id, 1);
      assert.equal(password, "123qweASD");
      return true;
    }),
    { outcome: "success" },
  );
  assert.deepEqual(await resetCustomerPassword(mechanic, 2, "123qweASD", async () => false), {
    outcome: "not_found",
  });
});

test("new browser client uses common Bearer transport and mandatory Oregon header, with no query/body", async () => {
  const calls: [string, RequestInit][] = [];
  const compiled = await build({
    entryPoints: [
      new URL("../../front/app/(app)/myvehicles/myvehicle-api.ts", import.meta.url).pathname,
    ],
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
    plugins: [
      {
        name: "transport-double",
        setup(builder) {
          builder.onResolve({ filter: /supabase\/client$/ }, () => ({
            path: "sdk",
            namespace: "double",
          }));
          builder.onLoad({ filter: /.*/, namespace: "double" }, () => ({
            contents: `export const createClient = () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'h.' + btoa(JSON.stringify({ iat: Math.floor(Date.now()/1000) })) + '.s' } } }) } });`,
          }));
        },
      },
    ],
  });
  const module = { exports: {} };
  new Function("module", "exports", "require", "fetch", compiled.outputFiles[0]!.text)(
    module,
    module.exports,
    createRequire(import.meta.url),
    async (path: string, init: RequestInit) => {
      calls.push([path, init]);
      return new Response('{"data":[]}');
    },
  );
  const api = module.exports as { listMyVehicles(error: string): Promise<unknown> };
  assert.deepEqual(await api.listMyVehicles("failed"), { data: [] });
  const [path, init] = calls[0]!;
  assert.ok(path.endsWith("/myvehicles"));
  assert.ok(!path.includes("?"));
  assert.equal(init.method, "GET");
  assert.equal(init.body, undefined);
  const headers = new Headers(init.headers);
  assert.match(headers.get("Authorization")!, /^Bearer /);
  assert.equal(headers.get("x-region"), "us-west-2");
});

test("static SQL account/RLS safeguards remain private, atomic and independent from editable metadata", () => {
  const schema = readFileSync(new URL("../../../supabase/schema.sql", import.meta.url), "utf8");
  for (const name of [
    "vehicles",
    "work_orders",
    "work_order_items",
    "work_order_recommendations",
  ]) {
    const policy = schema.match(new RegExp(`create policy ${name}_self_read[\\s\\S]*?;`))![0];
    assert.match(policy, /for select/);
    assert.doesNotMatch(policy, /for all/);
  }
  assert.match(schema, /status is distinct from 'rejected'/);
  assert.match(schema, /current_user = 'postgres'.*current_setting\('cardoc.password_reset'/);
  assert.match(schema, /new\.email is distinct from old\.email/);
  assert.match(schema, /delete from auth\.sessions where user_id = account_id/);
  assert.match(
    schema,
    /delete from public\.customers where id = target\.id;[\s\S]*delete from auth\.users where id = target\.user_id/,
  );
  assert.match(
    schema,
    /revoke all on all functions in schema private from public, anon, authenticated/,
  );
  assert.doesNotMatch(schema, /user_metadata.*user_role/);
});
