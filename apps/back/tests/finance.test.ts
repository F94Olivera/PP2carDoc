import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { build } from "esbuild";
import { PgDialect } from "drizzle-orm/pg-core";
import { financeQuerySchema } from "../src/schemas/finance.js";
import { toFinanceResponse } from "../src/mappers/finance-mapper.js";
import { getFinances } from "../src/services/finance-service.js";
import { workOrders } from "../src/models/work-order.js";
import type { AuthorizationContext } from "../src/schemas/authorization.js";
import type * as Repository from "../src/repositories/finance-repository.js";
import type * as Controller from "../src/controllers/finance-controller.js";
type DateRange = { startDate: string; endDate: string };
type Dates = {
  buenosAiresToday(now?: Date): string;
  getCurrentMonthRange(now?: Date): DateRange;
  getLastDaysRange(days: number, now?: Date): DateRange;
};

const context: AuthorizationContext = {
  userId: "mechanic",
  role: "MECHANIC",
  sessionId: "session",
  issuedAt: 1,
  expiresAt: 901,
};
const query = { startDate: "2026-10-01", endDate: "2026-10-17" };

test("finance query requires real ordered calendar dates and rejects unknown/repeated filters", () => {
  assert.deepEqual(financeQuerySchema.parse(query), query);
  assert.ok(
    financeQuerySchema.safeParse({ startDate: "2024-02-29", endDate: "2024-02-29" }).success,
  );
  for (const value of [
    {},
    { startDate: query.startDate },
    { ...query, startDate: "2026-02-29" },
    { ...query, endDate: "2026-04-31" },
    { ...query, startDate: "2026-10-18" },
    { ...query, startDate: "2026-10-01T00:00:00Z" },
    { ...query, startDate: "0000-01-01" },
    { ...query, endDate: [query.endDate, query.endDate] },
    { ...query, startDate: null },
    { ...query, mechanicId: "other" },
    { ...query, includeArchived: "false" },
  ])
    assert.equal(financeQuerySchema.safeParse(value).success, false, JSON.stringify(value));
});

test("finance mapper normalizes numeric aggregates including zero and rejects corrupt totals", () => {
  assert.deepEqual(toFinanceResponse("0"), { total: 0 });
  assert.deepEqual(toFinanceResponse("1234.5"), { total: 1234.5 });
  for (const value of [null, undefined, "", " ", "NaN", "Infinity", Infinity, -1, {}, true]) {
    assert.throws(() => toFinanceResponse(value), /Invalid finance aggregate/);
  }
});

test("finance service forwards identity/range and returns a fresh aggregate on every call", async () => {
  const totals = ["250", "325.5", "0", "0"];
  let calls = 0;
  const dependencies = {
    sumClosedOrderItems: async (identity: AuthorizationContext, range: typeof query) => {
      assert.equal(identity, context);
      assert.equal(range, query);
      return totals[calls++];
    },
  };
  for (const total of [250, 325.5, 0, 0]) {
    assert.deepEqual(await getFinances(context, query, dependencies), { total });
  }
  assert.equal(calls, 4);
  await assert.rejects(
    getFinances(context, query, {
      sumClosedOrderItems: async () => {
        throw new Error("database failure");
      },
    }),
    /database failure/,
  );
});

// Load actual modules with local doubles, without Auth, sockets or Postgres.
const load = async (
  path: string,
  filter: RegExp,
  contents: string,
  callback: (...args: unknown[]) => unknown,
) => {
  const result = await build({
    entryPoints: [new URL(path, import.meta.url).pathname],
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
    plugins: [
      {
        name: "isolated-dependency",
        setup(builder) {
          builder.onResolve({ filter }, () => ({ path: "dependency", namespace: "double" }));
          builder.onLoad({ filter: /.*/, namespace: "double" }, () => ({ contents }));
        },
      },
    ],
  });
  const module = { exports: {} };
  new Function("module", "exports", "callback", result.outputFiles[0]!.text)(
    module,
    module.exports,
    callback,
  );
  return module.exports;
};

test("finance repository parameterizes dates and retains the authenticated read-only boundary for both roles", async () => {
  const compiled: { sql: string; params: unknown[] }[] = [];
  const repository = (await load(
    "../src/repositories/finance-repository.ts",
    /\/database\.js$/,
    "export const withUserDatabase = (...args) => callback(...args);",
    async (...args) => {
      const [identity, operation, readOnly] = args as [
        AuthorizationContext,
        (tx: unknown) => Promise<unknown>,
        boolean,
      ];
      assert.ok(identity.role === "GOD" || identity === context);
      assert.equal(readOnly, true);
      return operation({
        execute: async (statement: Parameters<PgDialect["sqlToQuery"]>[0]) => {
          compiled.push(new PgDialect().sqlToQuery(statement));
          return [{ total: "75.5" }];
        },
      });
    },
  )) as typeof Repository;
  for (const identity of [context, { ...context, role: "GOD" as const }]) {
    assert.equal(await repository.sumClosedOrderItems(identity, query), "75.5");
  }
  for (const statement of compiled) {
    assert.match(statement.sql, /private\.finance_total\(\$1::date, \$2::date\)/);
    assert.deepEqual(statement.params, [query.startDate, query.endDate]);
    assert.doesNotMatch(statement.sql, /mechanic|GOD/);
  }
});

test("finance controller rejects invalid requests before service and returns only the shared total", async () => {
  let calls = 0;
  const controller = (await load(
    "../src/controllers/finance-controller.ts",
    /\/services\/finance-service\.js$/,
    "export const getFinances = (...args) => callback(...args);",
    async (...args) => {
      calls++;
      assert.equal(args[0], context);
      assert.deepEqual(args[1], query);
      return { total: 75.5 };
    },
  )) as typeof Controller;
  let status = 200;
  let body: unknown;
  const response = {
    locals: { authorization: context },
    status(code: number) {
      status = code;
      return this;
    },
    json(value: unknown) {
      body = value;
      return this;
    },
  };
  const invoke = async (value: unknown) =>
    controller.financesController(
      { query: value } as Parameters<typeof controller.financesController>[0],
      response as unknown as Parameters<typeof controller.financesController>[1],
      () => {},
    );
  await invoke({ ...query, endDate: [query.endDate] });
  assert.equal(status, 400);
  assert.equal(calls, 0);
  assert.ok(typeof (body as { error: string }).error === "string");
  status = 200;
  await invoke(query);
  assert.equal(status, 200);
  assert.deepEqual(body, { total: 75.5 });
  assert.equal(calls, 1);
});

test("financial SQL preserves owner/session gates and archived history without recommendation joins (static)", () => {
  const schema = readFileSync(new URL("../../../supabase/schema.sql", import.meta.url), "utf8");
  const aggregate = schema.match(/create function private\.finance_total[\s\S]*?end \$\$;/)?.[0];
  assert.ok(aggregate);
  assert.match(aggregate, /security definer set search_path = ''/);
  assert.match(aggregate, /auth\.uid\(\) is null or not private\.session_active\(\)/);
  assert.match(aggregate, /private\.current_app_role\(\) is null/);
  assert.match(aggregate, /where private\.can_access_mechanic\(c\.mechanic_id\)/);
  assert.match(aggregate, /coalesce\(sum\(i\.quantity::numeric \* i\.unit_price::numeric\), 0\)/);
  assert.match(aggregate, /w\.exit_date is not null/);
  assert.match(
    aggregate,
    /w\.exit_date >= .*start_date::timestamp at time zone 'America\/Argentina\/Buenos_Aires'.*at time zone 'UTC'/,
  );
  assert.match(aggregate, /w\.exit_date < .*end_date \+ 1.*at time zone 'UTC'/);
  assert.doesNotMatch(
    aggregate,
    /recommendations|is_active|entry_date|insert into|update public|delete from/,
  );
  assert.match(
    schema,
    /revoke all on all functions in schema private from public, anon, authenticated/,
  );
  assert.match(
    schema,
    /grant execute on function[\s\S]*?private\.finance_total\(date, date\) to authenticated/,
  );
  // The existing model serializes instants to UTC, even though SQL uses timestamp without timezone.
  assert.equal(
    workOrders.exitDate.mapToDriverValue(new Date("2026-10-17T00:00:00-03:00")),
    "2026-10-17T03:00:00.000Z",
  );
});

test("finance quick filters follow Buenos Aires midnight and calendar/leap boundaries", async () => {
  const dates = (await load(
    "../../front/app/(app)/finances/finance-dates.ts",
    /never-match/,
    "",
    () => {},
  )) as Dates;
  assert.equal(dates.buenosAiresToday(new Date("2026-11-01T02:59:59Z")), "2026-10-31");
  assert.equal(dates.buenosAiresToday(new Date("2026-11-01T03:00:00Z")), "2026-11-01");
  assert.deepEqual(dates.getCurrentMonthRange(new Date("2026-11-01T02:59:59Z")), {
    startDate: "2026-10-01",
    endDate: "2026-10-31",
  });
  assert.deepEqual(dates.getLastDaysRange(30, new Date("2024-03-01T03:00:00Z")), {
    startDate: "2024-02-01",
    endDate: "2024-03-01",
  });
  assert.deepEqual(dates.getLastDaysRange(1, new Date("2026-01-01T03:00:00Z")), {
    startDate: "2026-01-01",
    endDate: "2026-01-01",
  });
});
