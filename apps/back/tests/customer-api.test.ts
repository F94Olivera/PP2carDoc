import assert from "node:assert/strict";
import { test } from "node:test";
import type { CustomerResponse, UpdateCustomerRequest, VehicleResponse } from "@cardoc/types";
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
  entryPoints: [
    new URL("../../front/app/(app)/customers/customer-api.ts", import.meta.url).pathname,
  ],
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
  archiveCustomer(id: number, active: boolean, error: string): Promise<CustomerResponse>;
  updateCustomer(
    id: string,
    input: UpdateCustomerRequest,
    error: string,
  ): Promise<CustomerResponse>;
  listAllCustomers(error: string, includeArchived?: boolean): Promise<CustomerResponse[]>;
  listVehicles(error: string, includeArchived?: boolean): Promise<{ data: VehicleResponse[] }>;
};
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const reset = (...values: Response[]) => {
  calls.length = 0;
  responses = values;
};

test("archive, restore and general editing use the supported PATCH and strict payload", async () => {
  for (const isActive of [false, true]) {
    reset(json({ id: 7, isActive }));
    await api.archiveCustomer(7, isActive, "failed");
    assert.equal(calls[0]?.path, "/customers/7");
    assert.equal(calls[0]?.init?.method, "PATCH");
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), { isActive });
  }
  reset(json({ id: 7, firstName: "Clark" }));
  await api.updateCustomer("7", { firstName: "Clark", notes: null }, "failed");
  assert.equal(calls[0]?.path, "/customers/7");
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), { firstName: "Clark", notes: null });
  reset(json({ error: "conflict" }, 409));
  await assert.rejects(api.archiveCustomer(7, false, "failed"), /conflict/);
});

test("operational customer selection traverses every page without requesting archived customers", async () => {
  reset(
    json({ data: [{ id: 1 }], meta: { hasNextPage: true } }),
    json({ data: [{ id: 101 }], meta: { hasNextPage: false } }),
  );
  assert.deepEqual(await api.listAllCustomers("failed"), [{ id: 1 }, { id: 101 }]);
  assert.deepEqual(
    calls.map((call) => call.path),
    ["/customers?page=1&pageSize=100", "/customers?page=2&pageSize=100"],
  );
  reset(json({ data: [], meta: { hasNextPage: false } }));
  assert.deepEqual(await api.listAllCustomers("failed", true), []);
  assert.match(calls[0]!.path, /includeArchived=true/);
});

test("associated vehicles traverse every page and a failed later page is not partial success", async () => {
  reset(
    json({ data: [{ id: 1 }], meta: { hasNextPage: true } }),
    json({ data: [{ id: 101 }], meta: { hasNextPage: false } }),
  );
  assert.deepEqual((await api.listVehicles("failed", true)).data, [{ id: 1 }, { id: 101 }]);
  assert.match(calls[1]!.path, /page=2/);
  reset(
    json({ data: [{ id: 1 }], meta: { hasNextPage: true } }),
    json({ error: "unavailable" }, 503),
  );
  await assert.rejects(api.listVehicles("failed"), /unavailable/);
});
