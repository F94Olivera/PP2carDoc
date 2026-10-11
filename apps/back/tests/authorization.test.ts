import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifyAuthenticationError,
  canChooseMechanic,
  identityFromVerifiedToken,
} from "../src/schemas/authorization.js";
import { createCustomerSchema, updateCustomerSchema } from "../src/schemas/customer.js";

const userId = "ed30c681-b04c-4216-a35e-14d354972461";
const otherId = "4f1e78e8-2a0c-48e3-b7dd-70b5d572ae9a";
const sessionId = "94b9ee55-1492-498e-8a03-3494a9d24872";
const now = 1800000000;
// Fixtures represent already-verified tokens. This parser never verifies signatures.
const token = (overrides: Record<string, unknown> = {}) =>
  `header.${Buffer.from(
    JSON.stringify({
      sub: userId,
      session_id: sessionId,
      iat: now - 10,
      exp: now + 3600,
      role: "authenticated",
      ...overrides,
    }),
  ).toString("base64url")}.signature`;

test("verified identity caps lifetime at fifteen minutes", () => {
  assert.deepEqual(identityFromVerifiedToken(token(), userId, now * 1000), {
    userId,
    sessionId,
    issuedAt: now - 10,
    expiresAt: now + 890,
  });
});
test("token cannot claim an identity different from the verified user", () => {
  assert.equal(identityFromVerifiedToken(token({ sub: otherId }), userId, now * 1000), null);
});
test("expired, overly old and future tokens are rejected", () => {
  for (const claims of [{ exp: now }, { iat: now - 900 }, { iat: now + 31 }]) {
    assert.equal(identityFromVerifiedToken(token(claims), userId, now * 1000), null);
  }
});
test("missing or malformed session and elevated Postgres role are rejected", () => {
  for (const claims of [
    { session_id: undefined },
    { session_id: "bad" },
    { role: "service_role" },
    { iat: undefined },
  ]) {
    assert.equal(identityFromVerifiedToken(token(claims), userId, now * 1000), null);
  }
  assert.equal(identityFromVerifiedToken("invalid", userId), null);
});
test("untrusted user metadata and stale signed role do not alter identity", () => {
  assert.deepEqual(
    identityFromVerifiedToken(
      token({ user_metadata: { role: "GOD" }, app_metadata: { user_role: "GOD" } }),
      userId,
      now * 1000,
    ),
    identityFromVerifiedToken(token(), userId, now * 1000),
  );
});
test("mechanics cannot choose another owner; GOD can", () => {
  const context = {
    userId,
    sessionId,
    issuedAt: now,
    expiresAt: now + 900,
    role: "MECHANIC" as const,
  };
  assert.equal(canChooseMechanic(context), true);
  assert.equal(canChooseMechanic(context, userId), true);
  assert.equal(canChooseMechanic(context, otherId), false);
  assert.equal(canChooseMechanic({ ...context, role: "GOD" }, otherId), true);
  assert.equal(canChooseMechanic({ ...context, role: "GOD" }), false);
  assert.equal(canChooseMechanic({ ...context, role: "GOD" }, userId), false);
});
test("customer schemas reject privilege fields, generated fields and empty updates", () => {
  for (const field of ["role", "id", "createdAt", "user_metadata", "unexpected"]) {
    assert.equal(
      createCustomerSchema.safeParse({ firstName: "Clark", [field]: "GOD" }).success,
      false,
    );
    assert.equal(
      updateCustomerSchema.safeParse({ notes: "Updated", [field]: "GOD" }).success,
      false,
    );
  }
  assert.equal(updateCustomerSchema.safeParse({ mechanicId: otherId }).success, false);
  assert.equal(
    updateCustomerSchema.safeParse({ notes: "Edit", mechanicId: userId }).success,
    false,
  );
  assert.equal(updateCustomerSchema.safeParse({}).success, false);
  assert.equal(createCustomerSchema.safeParse({ firstName: "  " }).success, false);
  assert.equal(updateCustomerSchema.safeParse({ firstName: null }).success, false);
  assert.equal(
    createCustomerSchema.safeParse({ firstName: " Clark ", mechanicId: userId }).data?.firstName,
    "Clark",
  );
});

test("revoked sessions are authentication failures, not provider outages", () => {
  assert.equal(
    classifyAuthenticationError({ status: 400, name: "AuthSessionMissingError" }),
    "unauthorized",
  );
  assert.equal(
    classifyAuthenticationError({ status: 400, code: "session_not_found" }),
    "unauthorized",
  );
  assert.equal(classifyAuthenticationError({ status: 429 }), "rate_limited");
  assert.equal(classifyAuthenticationError({ status: 503 }), "unavailable");
  assert.equal(classifyAuthenticationError({ status: 400, code: "unexpected" }), "unavailable");
});
