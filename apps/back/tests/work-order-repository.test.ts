import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { drizzle } from "drizzle-orm/pg-proxy";
import type * as Repository from "../src/repositories/work-order-repository.js";
import type { AuthorizationContext } from "../src/schemas/authorization.js";

// Compile actual Drizzle queries against a local callback. No database or Auth calls.
const queries: { sql: string; params: unknown[] }[] = [];
const transactions: { context: AuthorizationContext; readOnly: boolean }[] = [];
let results: unknown[][][] = [];
const database = drizzle(async (sql, params) => {
  queries.push({ sql, params });
  return { rows: results.shift() ?? [] };
});
const execute = async (
  context: AuthorizationContext,
  operation: (tx: typeof database) => Promise<unknown>,
  readOnly = false,
) => {
  transactions.push({ context, readOnly });
  return operation(database);
};
const bundle = await build({
  entryPoints: [new URL("../src/repositories/work-order-repository.ts", import.meta.url).pathname],
  bundle: true,
  write: false,
  format: "cjs",
  platform: "node",
  plugins: [
    {
      name: "database-double",
      setup(builder) {
        builder.onResolve({ filter: /\/database\.js$/ }, () => ({
          path: "database",
          namespace: "double",
        }));
        builder.onLoad({ filter: /.*/, namespace: "double" }, () => ({
          contents: "export const withUserDatabase = (...args) => execute(...args);",
        }));
      },
    },
  ],
});
const module = { exports: {} };
new Function("module", "exports", "execute", bundle.outputFiles[0]!.text)(
  module,
  module.exports,
  execute,
);
const api = module.exports as typeof Repository;
const context: AuthorizationContext = {
  userId: "mechanic",
  role: "MECHANIC",
  sessionId: "session",
  issuedAt: 1,
  expiresAt: 901,
};
const reset = (...rows: unknown[][][]) => {
  queries.length = 0;
  transactions.length = 0;
  results = rows;
};

test("order lists retain active ancestors, ownership, status filter and stable pagination", async () => {
  reset([[0]], []);
  assert.deepEqual(
    await api.findWorkOrders(context, 2, { page: 2, pageSize: 10, withEndDate: false }),
    { rows: [], total: 0 },
  );
  assert.deepEqual(transactions, [{ context, readOnly: true }]);
  for (const query of queries) {
    assert.match(query.sql, /inner join "vehicles"/);
    assert.match(query.sql, /inner join "customers"/);
    assert.match(query.sql, /"customers"\."mechanic_id" =/);
    assert.match(query.sql, /"customers"\."is_active" =/);
    assert.match(query.sql, /"vehicles"\."is_active" =/);
    assert.match(query.sql, /"work_orders"\."exit_date" is null/);
  }
  assert.deepEqual(queries[1]!.params.slice(-2), [10, 10]);
  reset([[0]], []);
  await api.findWorkOrders({ ...context, role: "GOD" }, 2, {
    page: 1,
    pageSize: 10,
    withEndDate: true,
  });
  assert.match(queries[0]!.sql, /"exit_date" is not null/);
  assert.doesNotMatch(queries[0]!.sql, /"mechanic_id" =/);
  assert.match(queries[0]!.sql, /"customers"\."is_active" =/);
});
test("missing parent prevents creation and replacements before any mutation", async () => {
  reset([]);
  const input = {
    vehicleId: 2,
    entryDate: new Date(0),
    reportedProblem: "Noise",
    items: [],
    recommendations: [],
  };
  assert.equal(await api.insertWorkOrder(context, input), undefined);
  assert.equal(queries.length, 1);
  assert.match(queries[0]!.sql, /for share/);
  reset([]);
  assert.equal(
    await api.replaceWorkOrderById(context, 2, 3, { ...input, exitDate: null }),
    undefined,
  );
  assert.equal(queries.length, 1);
});
test("insert stores order and children in one authenticated transaction, forces open and normalizes status", async () => {
  reset(
    [[2]],
    [
      [
        3,
        2,
        "2026-10-17 03:00:00",
        null,
        null,
        "Noise",
        null,
        null,
        "2026-10-17 03:00:00",
        "2026-10-17 03:00:00",
      ],
    ],
    [],
    [],
  );
  await api.insertWorkOrder(context, {
    vehicleId: 2,
    entryDate: new Date("2026-10-17T03:00:00Z"),
    reportedProblem: "Noise",
    items: [{ description: "Inspection", category: "labor", quantity: 1, unitPrice: 100 }],
    recommendations: [{ description: "Review", status: "ACCEPTED" }],
  });
  assert.deepEqual(transactions, [{ context, readOnly: false }]);
  assert.equal(queries.length, 4);
  assert.match(queries[1]!.sql, /insert into "work_orders"/);
  assert.ok(queries[1]!.params.includes(null));
  assert.match(queries[2]!.sql, /insert into "work_order_items"/);
  assert.match(queries[3]!.sql, /insert into "work_order_recommendations"/);
  assert.ok(queries[3]!.params.includes("accepted"));
});
test("replace scopes vehicle and order before replacing children", async () => {
  reset([[2]], []);
  assert.equal(
    await api.replaceWorkOrderById(context, 2, 3, {
      entryDate: new Date(0),
      exitDate: null,
      reportedProblem: "Noise",
      items: [],
      recommendations: [],
    }),
    undefined,
  );
  assert.equal(queries.length, 2);
  assert.match(queries[1]!.sql, /where \(.*"id" = .*"vehicle_id" =/);
  reset(
    [[2]],
    [
      [
        3,
        2,
        "2026-10-17 03:00:00",
        null,
        null,
        "Noise",
        null,
        null,
        "2026-10-17 03:00:00",
        "2026-10-17 03:00:00",
      ],
    ],
    [],
    [],
  );
  await api.replaceWorkOrderById(context, 2, 3, {
    entryDate: new Date(0),
    exitDate: null,
    reportedProblem: "Noise",
    items: [],
    recommendations: [],
  });
  assert.equal(transactions.length, 1);
  assert.match(queries[2]!.sql, /delete from "work_order_items"/);
  assert.match(queries[3]!.sql, /delete from "work_order_recommendations"/);
});

test("child write failure escapes the transaction callback without partial success", async () => {
  reset(
    [[2]],
    [
      [
        3,
        2,
        "2026-10-17 03:00:00",
        null,
        null,
        "Noise",
        null,
        null,
        "2026-10-17 03:00:00",
        "2026-10-17 03:00:00",
      ],
    ],
  );
  const originalShift = results.shift.bind(results);
  results.shift = () => {
    if (queries.length === 3) throw new Error("child persistence failed");
    return originalShift();
  };
  await assert.rejects(
    api.insertWorkOrder(context, {
      vehicleId: 2,
      entryDate: new Date(0),
      reportedProblem: "Noise",
      items: [{ description: "Inspection", category: "labor", quantity: 1, unitPrice: 100 }],
      recommendations: [],
    }),
    (error: unknown) =>
      error instanceof Error &&
      error.cause instanceof Error &&
      error.cause.message === "child persistence failed",
  );
  assert.equal(transactions.length, 1);
  assert.equal(queries.length, 3);
});

test("delete checks parents and deletes only the order; existing child FKs own cascades", async () => {
  reset(
    [
      [
        3,
        2,
        "2026-10-17 03:00:00",
        null,
        null,
        "Noise",
        null,
        null,
        "2026-10-17 03:00:00",
        "2026-10-17 03:00:00",
      ],
    ],
    [[2]],
    [[3]],
  );
  assert.deepEqual(await api.deleteWorkOrderById(context, 3), { id: 3 });
  assert.equal(transactions.length, 1);
  assert.equal(queries.length, 3);
  assert.match(queries[0]!.sql, /"customers"\."mechanic_id" =/);
  assert.match(queries[1]!.sql, /for share/);
  assert.match(queries[2]!.sql, /delete from "work_orders" where "work_orders"\."id" =/);
  reset([]);
  assert.equal(await api.deleteWorkOrderById(context, 3), undefined);
  assert.equal(queries.length, 1);
});

test("missing or inaccessible order stops before reading children and scopes both parents", async () => {
  for (const role of ["MECHANIC", "GOD"] as const) {
    reset([]);
    const actor = { ...context, role };
    assert.equal(await api.findWorkOrderById(actor, 55), undefined);
    assert.equal(queries.length, 1);
    assert.deepEqual(transactions, [{ context: actor, readOnly: true }]);
    assert.match(queries[0]!.sql, /inner join "vehicles"/);
    assert.match(queries[0]!.sql, /inner join "customers"/);
    assert.match(queries[0]!.sql, /"vehicles"\."is_active" =/);
    assert.match(queries[0]!.sql, /"customers"\."is_active" =/);
    if (role === "MECHANIC") assert.match(queries[0]!.sql, /"customers"\."mechanic_id" =/);
    else assert.doesNotMatch(queries[0]!.sql, /"customers"\."mechanic_id" =/);
  }
});
