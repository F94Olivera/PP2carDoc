import assert from "node:assert/strict";
import { test } from "node:test";
import { sendCustomerWelcomeEmail } from "../src/repositories/email-repository.js";
import { sendRecoveryEmail } from "../src/repositories/auth-repository.js";

test("welcome uses fixed demo recipient and plain credentials; transport rejects failures and missing configuration", async () => {
  const previous = { ...process.env };
  const originalFetch = globalThis.fetch;
  Object.assign(process.env, {
    RESEND_API_KEY: "test-key",
    RESEND_TEST_TO: "demo@example.com",
    RESEND_FROM: "sender@example.com",
    FRONTEND_URL: "https://cardoc.test/",
  });
  let calls = 0;
  const send: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(init!.body as string), {
      from: "sender@example.com",
      to: ["demo@example.com"],
      subject: "Tu cuenta de carDoc",
      text: "Se creó tu cuenta de carDoc.\nUsuario: real@example.com\nContraseña inicial: initial-secret\nIngresá acá: https://cardoc.test/login",
    });
    return new Response(null, { status: 200 });
  };
  try {
    await sendCustomerWelcomeEmail("real@example.com", "initial-secret", send);
    assert.equal(calls, 1);
    await assert.rejects(
      sendCustomerWelcomeEmail(
        "real@example.com",
        "initial-secret",
        async () => new Response(null, { status: 503 }),
      ),
    );
    await assert.rejects(
      sendCustomerWelcomeEmail("real@example.com", "initial-secret", async () => {
        throw new Error("network");
      }),
    );
    globalThis.fetch = async (_url, init) => {
      const mail = JSON.parse(init!.body as string);
      assert.equal(mail.subject, "Restablecer contraseña de carDoc");
      assert.deepEqual(mail.to, ["demo@example.com"]);
      assert.match(mail.text, /https:\/\/cardoc.test\/reset-password/);
      return new Response(null, { status: 200 });
    };
    await sendRecoveryEmail("https://cardoc.test/reset-password");
    for (const key of ["RESEND_API_KEY", "RESEND_TEST_TO", "RESEND_FROM", "FRONTEND_URL"]) {
      const value = process.env[key];
      delete process.env[key];
      await assert.rejects(
        sendCustomerWelcomeEmail("real@example.com", "initial-secret", async () =>
          assert.fail("No network without configuration"),
        ),
      );
      process.env[key] = value;
    }
  } finally {
    process.env = previous;
    globalThis.fetch = originalFetch;
  }
});
