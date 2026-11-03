import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createCustomer,
  getCustomerById,
  updateCustomer,
} from "../src/services/customer-service.js";
import type { AuthorizationContext } from "../src/schemas/authorization.js";

const mechanicId = "ed30c681-b04c-4216-a35e-14d354972461";
const godId = "4f1e78e8-2a0c-48e3-b7dd-70b5d572ae9a";
const context: AuthorizationContext = {
  userId: mechanicId,
  role: "MECHANIC",
  customerId: null,
  sessionId: godId,
  issuedAt: 1,
  expiresAt: 901,
};
const row = {
  id: 1,
  mechanicId,
  uuid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  firstName: "Clark",
  lastName: null,
  email: "ana@example.com",
  phone: null,
  address: null,
  documentNumber: null,
  notes: null,
  isActive: true,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

test("creation defaults to the mechanic and GOD can explicitly assign that mechanic", async () => {
  for (const actor of [context, { ...context, userId: godId, role: "GOD" as const }]) {
    let calls = 0;
    const result = await createCustomer(
      actor,
      {
        firstName: "Clark",
        email: "clark@example.com",
        password: "123qweASD",
        ...(actor.role === "GOD" ? { mechanicId } : {}),
      },
      async (identity, input) => {
        calls++;
        assert.equal(identity, actor);
        assert.equal(input.mechanicId, mechanicId);
        return row;
      },
      async () => {},
    );
    assert.equal(calls, 1);
    assert.equal(result.outcome, "success");
    if (result.outcome === "success") assert.equal(result.customer.mechanicId, mechanicId);
  }
});

test("forbidden owner choices never reach persistence", async () => {
  const god = { ...context, userId: godId, role: "GOD" as const };
  for (const [actor, owner] of [
    [context, godId],
    [god, undefined],
    [god, godId],
  ] as const) {
    const result = await createCustomer(
      actor,
      { firstName: "Clark", email: "clark@example.com", password: "123qweASD", mechanicId: owner },
      async () => {
        assert.fail("Persistence must not be called");
      },
    );
    assert.equal(result.outcome, "forbidden");
  }
});

test("missing or non-MECHANIC owner rejected by persistence produces forbidden outcome", async () => {
  assert.deepEqual(
    await createCustomer(
      { ...context, userId: godId, role: "GOD" },
      { firstName: "Clark", email: "clark@example.com", password: "123qweASD", mechanicId },
      async () => null,
    ),
    { outcome: "forbidden" },
  );
});

test("archive and restore pass only the explicit active flag to persistence", async () => {
  for (const actor of [context, { ...context, userId: godId, role: "GOD" as const }]) {
    for (const isActive of [false, true]) {
      const result = await updateCustomer(
        actor,
        row.id,
        { isActive },
        async (identity, id, input) => {
          assert.equal(identity, actor);
          assert.equal(id, row.id);
          assert.deepEqual(input, { isActive });
          return { ...row, isActive };
        },
      );
      assert.equal(result.outcome, "success");
      if (result.outcome === "success") assert.equal(result.customer.isActive, isActive);
    }
  }
});

test("archive administration allows archived detail but preserves missing/foreign outcomes", async () => {
  const customer = await getCustomerById(context, row.id, async () => ({
    ...row,
    isActive: false,
  }));
  assert.equal(customer?.isActive, false);
  assert.equal(await getCustomerById(context, row.id, async () => undefined), null);
  assert.deepEqual(
    await updateCustomer(context, row.id, { isActive: true }, async () => undefined),
    { outcome: "not_found" },
  );
});

test("welcome runs after committed persistence; failure preserves creation without credentials in response", async () => {
  const input = { firstName: "Clark", email: row.email, password: "secret-initial" };
  for (const fails of [false, true]) {
    let committed = false;
    let sends = 0;
    const result = await createCustomer(
      context,
      input,
      async () => {
        await Promise.resolve();
        committed = true;
        return { ...row, password: input.password };
      },
      async (email, password) => {
        assert.equal(committed, true);
        assert.equal(email, row.email);
        assert.equal(password, input.password);
        sends++;
        if (fails) throw new Error("private provider details");
      },
    );
    assert.equal(sends, 1);
    assert.equal(result.outcome, "success");
    if (result.outcome === "success") {
      assert.equal(result.welcomeEmailStatus, fails ? "failed" : "sent");
      assert.doesNotMatch(JSON.stringify(result), /secret-initial|password|private provider/);
    }
  }
});

test("failed or rejected persistence never sends welcome", async () => {
  const input = { firstName: "Clark", email: row.email, password: "secret-initial" };
  const send = async () => assert.fail("Must not send before successful creation");
  await assert.rejects(
    createCustomer(
      context,
      input,
      async () => {
        throw new Error("rollback");
      },
      send,
    ),
    /rollback/,
  );
  assert.deepEqual(await createCustomer(context, input, async () => null, send), {
    outcome: "forbidden",
  });
});
