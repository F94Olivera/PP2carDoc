import assert from "node:assert/strict";
import pino from "pino";
import postgres from "postgres";

const logger = pino();
const base = process.env.TEST_API_URL ?? "http://127.0.0.1:54321/functions/v1/api";
const email = process.env.TEST_LOGIN_EMAIL;
const password = process.env.TEST_LOGIN_PASSWORD;
assert.ok(email && password, "Set TEST_LOGIN_EMAIL and TEST_LOGIN_PASSWORD in root .env");
assert.ok(process.env.DATABASE_URL, "Set DATABASE_URL to the database used by TEST_API_URL");

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: process.env.DATABASE_SSL === "false" ? false : "require",
});
let token;
const request = (path, init = {}) =>
  fetch(`${base}${path}`, { ...init, signal: AbortSignal.timeout(30_000) });
const list = (query) =>
  request(`/customers${query}`, { headers: { Authorization: `Bearer ${token}` } });

try {
  const unauthorized = await request("/customers");
  assert.equal(unauthorized.status, 401, "missing token");
  const login = await request("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.status, 200, "login");
  token = (await login.json()).session.access_token;

  for (const query of [
    "?page=0",
    "?pageSize=101",
    "?page=1.5",
    "?includeArchived=1",
    "?unexpected=true",
    "?page=1&page=2",
    "?page=9007199254740991&pageSize=100",
  ]) {
    assert.equal((await list(query)).status, 400, `invalid query ${query}`);
  }

  for (const includeArchived of [false, true]) {
    const [summary] = await sql`
      select count(*)::int as total from customers
      where ${includeArchived} or is_active = true
    `;
    const expectedRows = await sql`
      select id from customers where ${includeArchived} or is_active = true order by id limit 2
    `;
    const response = await list(`?page=1&pageSize=2&includeArchived=${includeArchived}`);
    assert.equal(response.status, 200, "authenticated listing");
    assert.equal(response.headers.get("cache-control"), "no-store");
    const result = await response.json();
    assert.deepEqual(
      result.data.map((customer) => customer.id),
      expectedRows.map((row) => row.id),
    );
    assert.deepEqual(result.meta, {
      page: 1,
      pageSize: 2,
      total: summary.total,
      totalPages: Math.ceil(summary.total / 2),
      hasNextPage: summary.total > 2,
      hasPreviousPage: false,
    });
    for (const customer of result.data) {
      assert.equal(typeof customer.firstName, "string");
      assert.equal(typeof customer.isActive, "boolean");
      assert.ok(Number.isFinite(Date.parse(customer.createdAt)), "serialized createdAt");
      assert.ok(Number.isFinite(Date.parse(customer.updatedAt)), "serialized updatedAt");
      if (!includeArchived) assert.equal(customer.isActive, true);
    }
    const next = await list(`?page=2&pageSize=2&includeArchived=${includeArchived}`);
    assert.equal(next.status, 200);
    const expectedNext = await sql`
      select id from customers where ${includeArchived} or is_active = true order by id limit 2 offset 2
    `;
    assert.deepEqual(
      (await next.json()).data.map((row) => row.id),
      expectedNext.map((row) => row.id),
    );
    const beyond = await list(
      `?page=${Math.ceil(summary.total / 2) + 1}&pageSize=2&includeArchived=${includeArchived}`,
    );
    assert.equal(beyond.status, 200);
    assert.deepEqual((await beyond.json()).data, []);
  }
  const defaults = await list("");
  assert.equal(defaults.status, 200);
  const result = await defaults.json();
  assert.equal(result.meta.page, 1);
  assert.equal(result.meta.pageSize, 10);
  logger.info(
    "PASS: customer authentication, query validation, defaults, pagination and database parity",
  );
} finally {
  try {
    if (token) {
      assert.equal(
        (
          await request("/logout", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          })
        ).status,
        204,
        "test session logout",
      );
    }
  } finally {
    await sql.end();
  }
}
