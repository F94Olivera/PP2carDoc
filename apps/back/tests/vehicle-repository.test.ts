import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { drizzle } from "drizzle-orm/pg-proxy";
import type * as Repository from "../src/repositories/vehicle-repository.js";
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
  entryPoints: [new URL("../src/repositories/vehicle-repository.ts", import.meta.url).pathname],
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

test("vehicle count and page share active parent/owner filters and transaction snapshot", async () => {
  reset([[0]], []);
  const result = await api.findVehicles(context, {
    page: 2,
    pageSize: 10,
    includeArchived: false,
    customerId: 3,
  });
  assert.deepEqual(result, { rows: [], total: 0 });
  assert.deepEqual(transactions, [{ context, readOnly: true }]);
  assert.equal(queries.length, 2);
  for (const query of queries) {
    assert.match(query.sql, /inner join "customers"/);
    assert.match(query.sql, /"customers"\."is_active" = \$/);
    assert.match(query.sql, /"customers"\."mechanic_id" = \$/);
    assert.match(query.sql, /"vehicles"\."is_active" = \$/);
    assert.deepEqual(query.params.slice(0, 4), [true, context.userId, true, 3]);
  }
  assert.match(queries[1]!.sql, /order by "vehicles"\."id" asc limit \$5 offset \$6/);
  assert.deepEqual(queries[1]!.params.slice(4), [10, 10]);
});

test("GOD and includeArchived preserve the active parent condition", async () => {
  reset([[0]], []);
  await api.findVehicles(
    { ...context, role: "GOD" },
    { page: 1, pageSize: 10, includeArchived: true },
  );
  for (const query of queries) {
    assert.match(query.sql, /"customers"\."is_active" = \$/);
    assert.doesNotMatch(query.sql, /"mechanic_id" =|"vehicles"\."is_active" =/);
    assert.equal(query.params[0], true);
  }
  reset([]);
  assert.equal(await api.findVehicleById(context, 7), undefined);
  assert.match(queries[0]!.sql, /"customers"\."is_active" =/);
  assert.match(queries[0]!.sql, /"customers"\."mechanic_id" =/);
  assert.deepEqual(transactions, [{ context, readOnly: true }]);
});

test("vehicle writes recheck accessible active parents within authenticated boundary", async () => {
  const input = {
    customerId: 3,
    licensePlate: "AB123CD",
    make: "Ford",
    model: "Focus",
    odometerUnit: "km" as const,
  };
  reset([]);
  assert.equal(await api.insertVehicle(context, input), undefined);
  assert.equal(queries.length, 1);
  assert.match(queries[0]!.sql, /"customers"\."is_active" =/);
  assert.match(queries[0]!.sql, /"customers"\."mechanic_id" =/);
  assert.match(queries[0]!.sql, /for share/);
  reset([[3]], []);
  await api.insertVehicle(context, input);
  assert.match(queries[1]!.sql, /insert into "vehicles"/);
  assert.deepEqual(transactions, [{ context, readOnly: false }]);
  for (const operation of [
    () => api.updateVehicleById(context, 7, { isActive: true }),
    () => api.deleteVehicleById(context, 7),
  ]) {
    reset([]);
    await operation();
    assert.match(
      queries[0]!.sql,
      /"vehicles"\."customer_id" in \(select "id" from "customers" where/,
    );
    assert.match(queries[0]!.sql, /"customers"\."is_active" =/);
    assert.match(queries[0]!.sql, /"customers"\."mechanic_id" =/);
    assert.deepEqual(transactions, [{ context, readOnly: false }]);
  }
});
