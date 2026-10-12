import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { toCustomerResponse } from "../src/mappers/customer-mapper.js";
import type * as Controllers from "../src/controllers/customer-controller.js";
import type * as Services from "../src/services/customer-service.js";

const context = {
  userId: "mechanic",
  role: "MECHANIC",
  sessionId: "session",
  issuedAt: 1,
  expiresAt: 901,
};
const row = {
  id: 7,
  mechanicId: context.userId,
  firstName: "Ana",
  lastName: null,
  email: null,
  phone: null,
  address: null,
  documentNumber: null,
  notes: null,
  isActive: false,
  createdAt: new Date("2026-10-17T12:00:00-03:00"),
  updatedAt: new Date(0),
};

// Replace persistence before evaluating either module: no database/Auth initialization.
const load = async () => {
  const calls: { name: string; args: unknown[] }[] = [];
  let result: unknown;
  let failure: Error | undefined;
  const compiled = await build({
    stdin: {
      contents:
        'export * from "./src/controllers/customer-controller.ts"; export * from "./src/services/customer-service.ts";',
      resolveDir: new URL("..", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
    plugins: [
      {
        name: "repository-double",
        setup(builder) {
          builder.onResolve({ filter: /\/repositories\/customer-repository\.js$/ }, () => ({
            path: "repository",
            namespace: "double",
          }));
          builder.onLoad({ filter: /.*/, namespace: "double" }, () => ({
            contents: [
              "findCustomers",
              "findCustomerById",
              "insertCustomer",
              "updateCustomerById",
              "deleteCustomerById",
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
      if (failure) throw failure;
      return result;
    },
  );
  return {
    api: module.exports as typeof Controllers & typeof Services,
    calls,
    returns(value: unknown) {
      result = value;
    },
    fails(error: Error) {
      failure = error;
    },
  };
};
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

test("customer mapper selects public fields, preserves null/archive and normalizes dates", () => {
  const mapped = toCustomerResponse({
    ...row,
    passwordHash: "private",
    verifier: "private",
  } as typeof row);
  assert.deepEqual(mapped, {
    ...row,
    createdAt: "2026-10-17T15:00:00.000Z",
    updatedAt: "1970-01-01T00:00:00.000Z",
  });
  assert.equal(row.createdAt instanceof Date, true);
});

test("customer controllers reject malformed input without reaching persistence", async () => {
  const { api, calls } = await load();
  for (const [handler, req] of [
    [api.listCustomersController, { query: { page: ["1", "2"] } }],
    [api.listCustomersController, { query: { page: "9007199254740991", pageSize: "100" } }],
    [api.customerByIdController, { params: { customerId: "0" } }],
    [api.createCustomerController, { body: { firstName: "Ana", id: 7 } }],
    [api.updateCustomerController, { params: { customerId: "7" }, body: { mechanicId: "other" } }],
    [api.deleteCustomerController, { params: { customerId: "-1" } }],
  ] as const) {
    const res = response();
    await handler(req as never, res as never, () => assert.fail("next"));
    assert.equal(res.statusCode, 400);
    assert.equal(typeof (res.body as { error: string }).error, "string");
  }
  assert.equal(calls.length, 0);
});

test("customer controllers translate successful CRUD, not found and forbidden outcomes", async () => {
  const { api, calls, returns } = await load();
  for (const [handler, req, value, status] of [
    [api.customerByIdController, { params: { customerId: "7" } }, row, 200],
    [api.customerByIdController, { params: { customerId: "7" } }, undefined, 404],
    [api.createCustomerController, { body: { firstName: "Ana" } }, row, 201],
    [api.createCustomerController, { body: { firstName: "Ana" } }, null, 403],
    [
      api.updateCustomerController,
      { params: { customerId: "7" }, body: { isActive: true } },
      row,
      200,
    ],
    [
      api.updateCustomerController,
      { params: { customerId: "7" }, body: { isActive: true } },
      undefined,
      404,
    ],
    [api.deleteCustomerController, { params: { customerId: "7" } }, { id: 7 }, 204],
    [api.deleteCustomerController, { params: { customerId: "7" } }, undefined, 404],
  ] as const) {
    returns(value);
    const res = response();
    await handler(req as never, res as never, () => assert.fail("next"));
    assert.equal(res.statusCode, status);
    if (status === 200 || status === 201) assert.deepEqual(res.body, toCustomerResponse(row));
    if (status === 204) {
      assert.equal(res.ended, true);
      assert.equal(res.body, undefined);
    }
    assert.deepEqual(calls.at(-1)?.args[0], context);
  }
  assert.equal(calls.length, 8);
});

test("customer listing maps pagination boundaries, archive filters and empty pages", async () => {
  const { api, calls, returns } = await load();
  for (const [page, total, rows, next, previous] of [
    [1, 21, [row], true, false],
    [3, 21, [row], false, true],
    [4, 0, [], false, true],
  ] as const) {
    returns({ rows, total });
    const res = response();
    await api.listCustomersController(
      { query: { page: String(page), pageSize: "10", includeArchived: "true" } } as never,
      res as never,
      () => assert.fail("next"),
    );
    assert.deepEqual(res.body, {
      data: rows.map(toCustomerResponse),
      meta: {
        page,
        pageSize: 10,
        total,
        totalPages: Math.ceil(total / 10),
        hasNextPage: next,
        hasPreviousPage: previous,
      },
    });
    assert.deepEqual(calls.at(-1)?.args[1], { page, pageSize: 10, includeArchived: true });
  }
});

test("customer use cases propagate persistence failures for central handling", async () => {
  const { api, fails } = await load();
  const failure = Object.assign(new Error("private failure"), { code: "23503" });
  fails(failure);
  for (const operation of [
    () => api.listCustomers(context as never, { page: 1, pageSize: 10, includeArchived: false }),
    () => api.getCustomerById(context as never, 7),
    () => api.createCustomer(context as never, { firstName: "Ana" }),
    () => api.updateCustomer(context as never, 7, { isActive: false }),
    () => api.deleteCustomer(context as never, 7),
  ])
    await assert.rejects(operation, (error) => error === failure);
});
