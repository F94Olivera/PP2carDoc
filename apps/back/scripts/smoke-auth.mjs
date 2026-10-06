import assert from "node:assert/strict";
import pino from "pino";

const logger = pino();
const base = process.env.TEST_API_URL ?? "http://127.0.0.1:54321/functions/v1/api";
const email = process.env.TEST_LOGIN_EMAIL;
const password = process.env.TEST_LOGIN_PASSWORD;
assert.ok(email && password, "Set TEST_LOGIN_EMAIL and TEST_LOGIN_PASSWORD in the root .env");

const request = (path, options = {}) =>
  fetch(`${base}${path}`, {
    ...options,
    signal: AbortSignal.timeout(30_000),
  });
const post = (body) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const expectStatus = (response, status, label) => assert.equal(response.status, status, label);

let token;
try {
  let response = await request("/ping");
  expectStatus(response, 200, "ping");
  assert.deepEqual(await response.json(), { pong: true });

  response = await request("/auth/me");
  expectStatus(response, 401, "unauthenticated me");
  response = await request("/logout", { method: "POST" });
  expectStatus(response, 401, "unauthenticated logout");
  response = await request("/auth/me", { headers: { Authorization: "Bearer not-a-jwt" } });
  expectStatus(response, 401, "invalid token");

  response = await request("/login", {
    method: "OPTIONS",
    headers: {
      Origin: "http://localhost:3000",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization,content-type",
    },
  });
  assert.ok([200, 204].includes(response.status), "CORS preflight (gateway or Express)");
  assert.equal(response.headers.get("access-control-allow-origin"), "*");

  response = await request("/login", post({ email, password, undeclared: true }));
  expectStatus(response, 400, "unknown body field");
  response = await request("/login", { ...post({}), body: "{" });
  expectStatus(response, 400, "malformed JSON");
  response = await request("/login", post({ email, password: "x".repeat(9000) }));
  expectStatus(response, 413, "oversized body");
  response = await request(
    "/login",
    post({ email, password: "intentionally-invalid-smoke-password" }),
  );
  expectStatus(response, 401, "invalid credentials");

  response = await request("/login", post({ email, password }));
  expectStatus(response, 200, "valid login");
  assert.equal(response.headers.get("cache-control"), "no-store");
  const login = await response.json();
  token = login.session?.access_token;
  assert.ok(token, "login must return an access token");
  assert.ok(login.session?.refresh_token, "login must return a refresh token");
  assert.equal(login.user.email, email);

  response = await request("/auth/me", { headers: { Authorization: `Bearer ${token}` } });
  expectStatus(response, 200, "authenticated me");
  const me = await response.json();
  assert.equal(me.user.id, login.user.id);
  assert.equal(me.user.email, email);
  logger.info(
    { base },
    "PASS: ping, CORS, validation, unauthorized requests, login and authenticated me",
  );
} finally {
  if (token) {
    const response = await request("/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    expectStatus(response, 204, "logout");
    logger.info({ base }, "PASS: logout (test session revoked)");
  }
}
