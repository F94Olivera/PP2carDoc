import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import type {
  CreateWorkOrderRequest,
  UpdateWorkOrderRequest,
  WorkOrderResponse,
} from "@cardoc/types";

// Bundle the browser module with an isolated transport double. Never load Auth or fetch.
const calls: { path: string; init?: RequestInit }[] = [];
let responses: Response[] = [];
const transport = async (path: string, init?: RequestInit) => {
  calls.push({ path, init });
  const response = responses.shift();
  assert.ok(response, "Unexpected request");
  return response;
};
const bundle = await build({
  entryPoints: [new URL("../../front/app/(app)/vehicles/vehicle-api.ts", import.meta.url).pathname],
  bundle: true,
  write: false,
  format: "cjs",
  platform: "node",
  plugins: [
    {
      name: "transport-double",
      setup(builder) {
        builder.onResolve({ filter: /auth-client$/ }, () => ({
          path: "auth-client",
          namespace: "double",
        }));
        builder.onLoad({ filter: /.*/, namespace: "double" }, () => ({
          contents: `
      export const fetchAuthenticated = (...args) => transport(...args);
      export const handleUnauthorizedResponse = () => {};
      export const getErrorMessage = async (response, fallback) => (await response.json()).error || fallback;
    `,
        }));
      },
    },
  ],
});
const module = { exports: {} };
new Function("module", "exports", "transport", bundle.outputFiles[0]!.text)(
  module,
  module.exports,
  transport,
);
const api = module.exports as {
  listAllWorkOrdersByVehicle(options: {
    vehicleId: number;
    withEndDate?: boolean;
    fallbackError: string;
  }): Promise<{ data: WorkOrderResponse[] }>;
  createWorkOrder(input: CreateWorkOrderRequest, error: string): Promise<WorkOrderResponse>;
  updateWorkOrder(
    vehicleId: number,
    id: number,
    input: UpdateWorkOrderRequest,
    error: string,
  ): Promise<WorkOrderResponse>;
  getWorkOrder(id: number, error: string): Promise<WorkOrderResponse>;
  deleteWorkOrder(id: number, error: string): Promise<void>;
};
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const reset = (...values: Response[]) => {
  calls.length = 0;
  responses = values;
};
test("order client traverses all pages, preserves filters, and rejects incomplete results", async () => {
  reset(
    json({ data: [{ id: 1 }], meta: { hasNextPage: true } }),
    json({ data: [{ id: 2 }], meta: { hasNextPage: false } }),
  );
  const result = await api.listAllWorkOrdersByVehicle({
    vehicleId: 7,
    withEndDate: true,
    fallbackError: "failed",
  });
  assert.deepEqual(
    result.data.map((order) => order.id),
    [1, 2],
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[1]?.path, "/vehicles/7/work-orders?page=2&pageSize=100&withEndDate=true");
  reset(json({ data: [{ id: 1 }], meta: { hasNextPage: true } }), json({ error: "Expired" }, 401));
  await assert.rejects(
    api.listAllWorkOrdersByVehicle({ vehicleId: 7, fallbackError: "failed" }),
    /Expired/,
  );
});
test("order mutations use authenticated domain transport, separate bodies and controlled failures", async () => {
  const input = {
    vehicleId: 7,
    entryDate: "2026-10-17T03:00:00Z",
    reportedProblem: "Noise",
    items: [],
  };
  reset(json({ id: 3 }));
  await api.createWorkOrder(input, "failed");
  assert.equal(calls[0]?.path, "/work-orders");
  assert.equal(calls[0]?.init?.method, "POST");
  assert.equal(JSON.parse(String(calls[0]?.init?.body)).exitDate, undefined);
  const update = {
    entryDate: input.entryDate,
    reportedProblem: input.reportedProblem,
    items: [],
    exitDate: null,
  };
  reset(json({ id: 3 }));
  await api.updateWorkOrder(7, 3, update, "failed");
  assert.equal(calls[0]?.path, "/vehicles/7/work-orders/3");
  assert.equal(calls[0]?.init?.method, "PUT");
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), update);
  reset(new Response(null, { status: 204 }));
  await api.deleteWorkOrder(3, "failed");
  assert.equal(calls[0]?.init?.method, "DELETE");
  reset(json({ error: "Missing" }, 404));
  await assert.rejects(api.getWorkOrder(3, "failed"), /Missing/);
});
