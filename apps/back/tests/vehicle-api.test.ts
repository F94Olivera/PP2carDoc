import assert from "node:assert/strict";
import { test } from "node:test";
import type { UpdateVehicleRequest, VehicleResponse } from "@cardoc/types";
import { build } from "esbuild";

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
  archiveVehicle(id: number, active: boolean, error: string): Promise<VehicleResponse>;
  updateVehicle(id: number, input: UpdateVehicleRequest, error: string): Promise<VehicleResponse>;
  deleteVehicle(id: number, error: string): Promise<void>;
  listAllVehicles(options: {
    fallbackError: string;
    includeArchived?: boolean;
  }): Promise<{ data: VehicleResponse[] }>;
};
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const reset = (...values: Response[]) => {
  calls.length = 0;
  responses = values;
};
test("vehicle editing and archive/restore use authenticated transport and immutable parent", async () => {
  const input: UpdateVehicleRequest = {
    licensePlate: "AB123CD",
    make: "Ford",
    model: "Focus",
    odometerUnit: "km",
  };
  reset(json({ id: 7 }));
  await api.updateVehicle(7, input, "failed");
  assert.equal(calls[0]?.init?.method, "PUT");
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), input);
  for (const isActive of [false, true]) {
    reset(json({ id: 7, isActive }));
    await api.archiveVehicle(7, isActive, "failed");
    assert.equal(calls[0]?.path, "/vehicles/7/archive");
    assert.equal(calls[0]?.init?.method, "PATCH");
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), { isActive });
  }
  reset(new Response(null, { status: 204 }));
  await api.deleteVehicle(7, "failed");
  assert.equal(calls[0]?.init?.method, "DELETE");
  reset(json({ error: "Related orders" }, 409));
  await assert.rejects(api.deleteVehicle(7, "failed"), /Related orders/);
});
test("vehicle search traverses all pages and rejects partial results or expired session", async () => {
  reset(
    json({ data: [{ id: 1 }], meta: { hasNextPage: true } }),
    json({ data: [{ id: 101 }], meta: { hasNextPage: false } }),
  );
  assert.deepEqual(
    (await api.listAllVehicles({ fallbackError: "failed", includeArchived: true })).data,
    [{ id: 1 }, { id: 101 }],
  );
  assert.match(calls[1]!.path, /page=2&pageSize=100&includeArchived=true/);
  reset(json({ data: [{ id: 1 }], meta: { hasNextPage: true } }), json({ error: "Expired" }, 401));
  await assert.rejects(api.listAllVehicles({ fallbackError: "failed" }), /Expired/);
});
