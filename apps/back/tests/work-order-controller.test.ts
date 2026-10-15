import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import type * as Controllers from "../src/controllers/work-order-controller.js";
const context = {
  userId: "mechanic",
  role: "MECHANIC",
  sessionId: "session",
  issuedAt: 1,
  expiresAt: 901,
};
const calls: { name: string; args: unknown[] }[] = [];
let result: unknown;
const compiled = await build({
  entryPoints: [new URL("../src/controllers/work-order-controller.ts", import.meta.url).pathname],
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
  plugins: [
    {
      name: "service-double",
      setup(builder) {
        builder.onResolve({ filter: /\/services\/work-order-service\.js$/ }, () => ({
          path: "service",
          namespace: "double",
        }));
        builder.onLoad({ filter: /.*/, namespace: "double" }, () => ({
          contents: [
            "createWorkOrder",
            "getWorkOrderById",
            "listWorkOrders",
            "updateWorkOrder",
            "deleteWorkOrder",
          ]
            .map((name) => `export const ${name} = (...args) => invoke("${name}", args);`)
            .join("\n"),
        }));
      },
    },
  ],
});
const module = { exports: {} };
new Function("module", "exports", "invoke", compiled.outputFiles[0]!.text)(
  module,
  module.exports,
  async (name: string, args: unknown[]) => {
    calls.push({ name, args });
    return result;
  },
);
const api = module.exports as typeof Controllers;
const response = () => ({
  locals: { authorization: context },
  statusCode: 200,
  body: undefined as unknown,
  ended: false,
  status(code: number) {
    this.statusCode = code;
    return this;
  },
  json(body: unknown) {
    this.body = body;
    return this;
  },
  end() {
    this.ended = true;
    return this;
  },
});

const invoke = async (handler: (typeof api)[keyof typeof api], req: unknown) => {
  const res = response();
  await handler(
    req as Parameters<typeof handler>[0],
    res as unknown as Parameters<typeof handler>[1],
    () => {},
  );
  return res;
};
test("order controllers reject invalid requests before invoking services", async () => {
  calls.length = 0;
  for (const [handler, request] of [
    [api.createWorkOrderController, { body: {} }],
    [api.workOrderByIdController, { params: { workOrderId: "0" } }],
    [api.workOrdersByVehicleController, { params: { vehicleId: "1" }, query: { pageSize: "101" } }],
    [api.replaceWorkOrderController, { params: { vehicleId: "1", workOrderId: "2" }, body: {} }],
    [api.deleteWorkOrderController, { params: { workOrderId: "bad" } }],
  ] as const)
    assert.equal((await invoke(handler, request)).statusCode, 400);
  assert.equal(calls.length, 0);
});
test("order controllers forward validated scope and return create/detail/list/replace/delete outcomes", async () => {
  const body = {
    vehicleId: 1,
    entryDate: "2026-10-17T03:00:00Z",
    reportedProblem: "Noise",
    items: [],
  };
  result = { id: 2 };
  assert.equal((await invoke(api.createWorkOrderController, { body })).statusCode, 201);
  assert.deepEqual(calls.at(-1)?.args[0], context);
  assert.equal(
    (await invoke(api.workOrderByIdController, { params: { workOrderId: "2" } })).body,
    result,
  );
  assert.equal(
    (await invoke(api.workOrdersByVehicleController, { params: { vehicleId: "1" }, query: {} }))
      .body,
    result,
  );
  assert.deepEqual(calls.at(-1)?.args.slice(1), [1, { page: 1, pageSize: 10, withEndDate: false }]);
  const update = {
    entryDate: body.entryDate,
    reportedProblem: body.reportedProblem,
    items: [],
    exitDate: null,
  };
  assert.equal(
    (
      await invoke(api.replaceWorkOrderController, {
        params: { vehicleId: "1", workOrderId: "2" },
        body: update,
      })
    ).body,
    result,
  );
  result = true;
  const deleted = await invoke(api.deleteWorkOrderController, { params: { workOrderId: "2" } });
  assert.equal(deleted.statusCode, 204);
  assert.equal(deleted.ended, true);
  result = null;
  for (const [handler, request] of [
    [api.createWorkOrderController, { body }],
    [api.workOrderByIdController, { params: { workOrderId: "2" } }],
    [api.workOrdersByVehicleController, { params: { vehicleId: "1" }, query: {} }],
    [
      api.replaceWorkOrderController,
      { params: { vehicleId: "1", workOrderId: "2" }, body: update },
    ],
    [api.deleteWorkOrderController, { params: { workOrderId: "2" } }],
  ] as const)
    assert.equal((await invoke(handler, request)).statusCode, 404);
});
