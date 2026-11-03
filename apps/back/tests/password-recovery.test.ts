import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { build } from "esbuild";
import { forgotPasswordSchema } from "../src/schemas/auth.js";
import { isValidPassword, PASSWORD_RECOVERY_MESSAGE } from "@cardoc/types";

const load = async (entry: string, doubles: Record<string, unknown>, browser?: object) => {
  const bundle = await build({
    entryPoints: [new URL(entry, import.meta.url).pathname],
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
    plugins: [
      {
        name: "doubles",
        setup(builder) {
          builder.onResolve(
            { filter: /(@supabase\/supabase-js|supabase\/client|pino)$/ },
            ({ path }) => ({ path, namespace: "double" }),
          );
          builder.onLoad({ filter: /.*/, namespace: "double" }, ({ path }) => ({
            contents:
              path === "pino"
                ? "export default () => ({ warn: () => {}, error: () => {} });"
                : "export const createClient = (...args) => doubles.createClient(...args);",
          }));
          builder.onResolve({ filter: /user-profile-repository\.js$/ }, () => ({
            path: "profile",
            namespace: "profile",
          }));
          builder.onLoad({ filter: /.*/, namespace: "profile" }, () => ({
            contents:
              "export const findCurrentUserProfile = () => { throw Error('Unexpected profile call'); };",
          }));
          // The service's other imports must not connect to Postgres during unit tests.
          builder.onResolve({ filter: /database\.js$/ }, () => ({
            path: "database",
            namespace: "db",
          }));
          builder.onLoad({ filter: /.*/, namespace: "db" }, () => ({
            contents:
              "export const isInactiveSession = () => false; export const withUserDatabase = () => {};",
          }));
        },
      },
    ],
  });
  const module = { exports: {} as Record<string, (...args: never[]) => Promise<unknown>> };
  new Function(
    "module",
    "exports",
    "doubles",
    "fetch",
    "window",
    "require",
    bundle.outputFiles[0]!.text,
  )(module, module.exports, doubles, doubles.fetch, browser, createRequire(import.meta.url));
  return module.exports;
};

test("recovery schema rejects extra fields and invalid emails; password limits include UTF-8 bytes", () => {
  assert.deepEqual(forgotPasswordSchema.parse({ email: " Account@Example.com " }), {
    email: "account@example.com",
  });
  for (const input of [
    { email: "bad" },
    { email: "a@example.com", redirect: "https://evil.test" },
    {},
  ])
    assert.equal(forgotPasswordSchema.safeParse(input).success, false);
  assert.equal(isValidPassword("1234567"), false);
  assert.equal(isValidPassword("12345678"), true);
  assert.equal(isValidPassword("é".repeat(37)), false);
});

test("public controller hides missing accounts and Resend failures, sends only to demo recipient", async () => {
  const previous = { ...process.env };
  Object.assign(process.env, {
    SUPABASE_URL: "https://project.test",
    SUPABASE_SERVICE_ROLE_KEY: "admin-secret",
    FRONTEND_URL: "https://cardoc.test",
    RESEND_API_KEY: "resend-secret",
    RESEND_TEST_TO: "demo@example.com",
    RESEND_FROM: "onboarding@resend.dev",
  });
  delete process.env.SUPABASE_SECRET_KEY;
  try {
    for (const mode of [
      "success",
      "secret-key",
      "missing",
      "send-failure",
      "throw",
      "missing-config",
    ]) {
      if (mode === "secret-key") process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
      else delete process.env.SUPABASE_SECRET_KEY;
      const calls: unknown[] = [];
      const mail: { to: string[]; text: string }[] = [];
      if (mode === "missing-config") delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      const api = await load("../src/controllers/auth-controller.ts", {
        createClient: (url: string, key: string, options: unknown) => {
          assert.equal(key, mode === "secret-key" ? "sb_secret_test" : "admin-secret");
          calls.push({ url, key, options });
          return {
            auth: {
              admin: {
                generateLink: async (input: unknown) => {
                  calls.push(input);
                  if (mode === "throw") throw new Error("secret provider details");
                  return {
                    data: {
                      properties: mode === "missing" ? null : { hashed_token: "hash-secret" },
                    },
                    error: mode === "missing" ? {} : null,
                  };
                },
              },
            },
          };
        },
        fetch: async (url: string, init: RequestInit) => {
          assert.equal(url, "https://api.resend.com/emails");
          mail.push(JSON.parse(init.body as string));
          return new Response(null, { status: mode === "send-failure" ? 503 : 200 });
        },
      });
      let body: unknown;
      let status = 200;
      const headers: Record<string, string> = {};
      const response = {
        setHeader: (key: string, value: string) => {
          headers[key] = value;
        },
        status: (value: number) => {
          status = value;
          return response;
        },
        json: (value: unknown) => {
          body = value;
        },
      };
      await api.forgotPasswordController!(
        { body: { email: "account@example.com" } } as never,
        response as never,
      );
      assert.equal(status, 200);
      assert.deepEqual(body, { message: PASSWORD_RECOVERY_MESSAGE });
      assert.equal(headers["Cache-Control"], "no-store");
      if (mode === "success" || mode === "secret-key" || mode === "send-failure") {
        assert.deepEqual(calls[1], { type: "recovery", email: "account@example.com" });
        assert.deepEqual(mail[0]!.to, ["demo@example.com"]);
        assert.match(
          mail[0]!.text,
          /https:\/\/cardoc.test\/reset-password\?token_hash=hash-secret/,
        );
      } else assert.equal(mail.length, 0);
      await api.forgotPasswordController!(
        { body: { email: "invalid", extra: true } } as never,
        response as never,
      );
      assert.equal(status, 400);
    }
  } finally {
    process.env = previous;
  }
});

test("SSR recovery exchanges once, cleans URL, retries update and sign-out without repeating update", async () => {
  let verifies = 0,
    updates = 0,
    signouts = 0;
  let updateFails = true,
    signoutFails = true;
  const replaced: unknown[][] = [];
  const api = await load(
    "../../front/app/lib/password-recovery.ts",
    {
      createClient: () => ({
        auth: {
          verifyOtp: async (input: unknown) => {
            verifies++;
            assert.deepEqual(input, { token_hash: "one-use", type: "recovery" });
            return { data: { session: {} }, error: null };
          },
          updateUser: async (input: unknown) => {
            updates++;
            assert.deepEqual(input, { password: "new-password" });
            return { error: updateFails ? { message: "try again" } : null };
          },
          signOut: async (input: unknown) => {
            signouts++;
            assert.deepEqual(input, { scope: "local" });
            return { error: signoutFails ? {} : null };
          },
        },
      }),
    },
    {
      location: { href: "https://cardoc.test/reset-password?token_hash=one-use" },
      history: { replaceState: (...args: unknown[]) => replaced.push(args) },
    },
  );
  assert.deepEqual(await Promise.all([api.verifyRecoveryLink!(), api.verifyRecoveryLink!()]), [
    true,
    true,
  ]);
  assert.equal(verifies, 1);
  assert.deepEqual(replaced, [[null, "", "/reset-password"]]);
  await assert.rejects(api.completePasswordRecovery!("new-password" as never), /try again/);
  updateFails = false;
  await assert.rejects(api.completePasswordRecovery!("new-password" as never), /cerrar la sesión/);
  signoutFails = false;
  await api.completePasswordRecovery!("new-password" as never);
  assert.equal(updates, 2);
  assert.equal(signouts, 2);
});

test("missing, used and expired links cannot enable the recovery form", async () => {
  for (const hash of ["", "?token_hash=expired"]) {
    const api = await load(
      "../../front/app/lib/password-recovery.ts",
      {
        createClient: () => ({
          auth: {
            verifyOtp: async () => ({ data: { session: null }, error: { code: "otp_expired" } }),
          },
        }),
      },
      {
        location: { href: `https://cardoc.test/reset-password${hash}` },
        history: { replaceState: () => {} },
      },
    );
    assert.equal(await api.verifyRecoveryLink!(), false);
  }
});
