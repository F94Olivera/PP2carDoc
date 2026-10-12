import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { toLoginResponse, toUserResponse } from "../src/mappers/auth-mapper.js";
import type * as Controllers from "../src/controllers/auth-controller.js";
import type * as Services from "../src/services/auth-service.js";
import type { Session, User } from "@supabase/supabase-js";

const load = async (
  entry: string,
  filter: RegExp,
  contents: string,
  invoke: (...args: unknown[]) => unknown,
) => {
  const compiled = await build({
    entryPoints: [new URL(entry, import.meta.url).pathname],
    bundle: true,
    write: false,
    platform: "node",
    external: ["pino"],
    format: "cjs",
    plugins: [
      {
        name: "auth-double",
        setup(builder) {
          builder.onResolve({ filter: /\/database\.js$/ }, () => ({
            path: "database",
            namespace: "isolated-db",
          }));
          builder.onLoad({ filter: /.*/, namespace: "isolated-db" }, () => ({
            contents:
              'export const isInactiveSession = error => error?.code === "SESSION_INACTIVE"; export const withUserDatabase = () => { throw Error("Database forbidden in unit tests"); };',
          }));
          builder.onResolve({ filter }, () => ({ path: "dependency", namespace: "double" }));
          builder.onLoad({ filter: /.*/, namespace: "double" }, () => ({ contents }));
        },
      },
    ],
  });
  const module = { exports: {} };
  new Function("module", "exports", "invoke", "require", compiled.outputFiles[0]!.text)(
    module,
    module.exports,
    invoke,
    createRequire(import.meta.url),
  );
  return module.exports;
};
const response = () => ({
  locals: { accessToken: "verified-token", user: { id: "user", role: "MECHANIC" } },
  statusCode: 200,
  body: undefined as unknown,
  ended: false,
  headers: {} as Record<string, string>,
  setHeader(name: string, value: string) {
    this.headers[name] = value;
  },
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

test("auth mappers exclude provider metadata and internal session fields", () => {
  const user = {
    id: "user",
    email: "ana@example.com",
    user_metadata: { role: "GOD", secret: "private" },
  } as unknown as User;
  assert.deepEqual(toUserResponse(user, "MECHANIC"), {
    id: "user",
    email: "ana@example.com",
    role: "MECHANIC",
  });
  assert.equal(toUserResponse({ id: "user" } as User, "GOD").email, null);
  const session = {
    access_token: "access",
    refresh_token: "refresh",
    token_type: "bearer",
    expires_in: 900,
    expires_at: 1000,
    provider_token: "private",
    user,
  } as Session;
  assert.deepEqual(toLoginResponse(toUserResponse(user, "MECHANIC"), session), {
    user: { id: "user", email: "ana@example.com", role: "MECHANIC" },
    session: {
      access_token: "access",
      refresh_token: "refresh",
      token_type: "bearer",
      expires_in: 900,
      expires_at: 1000,
    },
  });
});

test("auth controllers translate login/logout outcomes, cache headers and failures", async () => {
  let result: unknown;
  let failure = false;
  const calls: unknown[][] = [];
  const api = (await load(
    "../src/controllers/auth-controller.ts",
    /\/services\/auth-service\.js$/,
    'export const login = (...args) => invoke("login", ...args); export const logout = (...args) => invoke("logout", ...args);',
    async (...args) => {
      calls.push(args);
      if (failure) throw new Error("private service failure");
      return result;
    },
  )) as typeof Controllers;
  for (const [handler, request, method] of [
    [api.loginController, { body: { email: "ana@example.com", password: "password" } }, "login"],
    [api.logoutController, {}, "logout"],
  ] as const) {
    for (const [outcome, expected] of [
      ["success", method === "login" ? 200 : 204],
      ["unauthorized", 401],
      ["rate_limited", 429],
      ["unavailable", 503],
    ] as const) {
      result = { outcome, response: { user: { id: "user" } } };
      const res = response();
      await handler(request as never, res as never, () => assert.fail("next"));
      assert.equal(res.statusCode, expected);
      assert.equal(res.headers["Cache-Control"], "no-store");
      assert.deepEqual(calls.at(-1), [
        method,
        method === "login" ? request.body : "verified-token",
      ]);
      if (expected === 204) assert.equal(res.ended, true);
      else if (expected === 200) assert.deepEqual(res.body, { user: { id: "user" } });
      else assert.equal(typeof (res.body as { error: string }).error, "string");
      if (method === "logout" && expected === 401)
        assert.equal(res.headers["WWW-Authenticate"], "Bearer");
    }
    failure = true;
    const res = response();
    await handler(request as never, res as never, () => assert.fail("next"));
    assert.equal(res.statusCode, 503);
    assert.doesNotMatch(JSON.stringify(res.body), /private/);
    failure = false;
  }
  const count = calls.length;
  const res = response();
  await api.loginController(
    { body: { email: "bad", password: "", role: "GOD" } } as never,
    res as never,
    () => assert.fail("next"),
  );
  assert.equal(res.statusCode, 400);
  assert.equal(calls.length, count);
  api.meController({} as never, res as never, () => assert.fail("next"));
  assert.deepEqual(res.body, { user: res.locals.user });
});

test("auth logout service classifies provider errors without external calls", async () => {
  let error: unknown;
  const api = (await load(
    "../src/services/auth-service.ts",
    /\/repositories\/auth-repository\.js$/,
    'export const revokeSession = (...args) => invoke(...args); export const findUserByAccessToken = () => { throw Error("Unexpected Auth call"); }; export const signInWithPassword = () => { throw Error("Unexpected Auth call"); };',
    async (...args) => {
      assert.deepEqual(args, ["session-token"]);
      return { error };
    },
  )) as typeof Services;
  for (const [providerError, outcome] of [
    [null, "success"],
    [{ status: 429 }, "rate_limited"],
    [{ status: 401 }, "unauthorized"],
    [{ status: 403 }, "unauthorized"],
    [{ status: 404 }, "unauthorized"],
    [{ status: 500 }, "unavailable"],
  ] as const) {
    error = providerError;
    assert.deepEqual(await api.logout("session-token"), { outcome });
  }
});

test("auth login/current-user use cases honor verified identity, current role and revoke rejected sessions", async () => {
  const userId = "ed30c681-b04c-4216-a35e-14d354972461";
  const issuedAt = Math.floor(Date.now() / 1000);
  const token = `header.${Buffer.from(JSON.stringify({ sub: userId, session_id: "4f1e78e8-2a0c-48e3-b7dd-70b5d572ae9a", iat: issuedAt, exp: issuedAt + 900, role: "authenticated" })).toString("base64url")}.verified-by-double`;
  const user = { id: userId, email: "ana@example.com", user_metadata: { role: "GOD" } };
  const session = {
    access_token: token,
    refresh_token: "refresh",
    token_type: "bearer",
    expires_in: 900,
  };
  let profile: unknown = { role: "MECHANIC" };
  let profileFailure: unknown;
  let authError: unknown = null;
  let anonymous = false;
  let revoked = 0;
  const api = (await load(
    "../src/services/auth-service.ts",
    /\/repositories\/(auth|user-profile)-repository\.js$/,
    ["findUserByAccessToken", "signInWithPassword", "revokeSession", "findCurrentUserProfile"]
      .map((name) => `export const ${name} = (...args) => invoke("${name}", ...args);`)
      .join("\n"),
    async (name, ...args) => {
      if (name === "findCurrentUserProfile") {
        assert.equal((args[0] as { userId: string }).userId, userId);
        if (profileFailure) throw profileFailure;
        return profile;
      }
      if (name === "revokeSession") {
        assert.equal(args[0], token);
        revoked++;
        return { error: null };
      }
      if (name === "signInWithPassword")
        assert.deepEqual(args[0], { email: user.email, password: "password" });
      return { data: { user: { ...user, is_anonymous: anonymous }, session }, error: authError };
    },
  )) as typeof Services;
  const credentials = { email: user.email, password: "password" };
  const success = await api.login(credentials);
  assert.equal(success.outcome, "success");
  if (success.outcome === "success") assert.equal(success.response.user.role, "MECHANIC");
  assert.equal(revoked, 0);
  for (const invalid of [undefined, { role: "INVALID" }]) {
    profile = invalid;
    assert.equal((await api.login(credentials)).outcome, "unauthorized");
  }
  assert.equal(revoked, 2);
  profile = { role: "MECHANIC" };
  for (const [failure, outcome] of [
    [{ code: "SESSION_INACTIVE" }, "unauthorized"],
    [new Error("database unavailable"), "unavailable"],
  ] as const) {
    profileFailure = failure;
    assert.equal((await api.getCurrentUser(token)).outcome, outcome);
  }
  profileFailure = undefined;
  anonymous = true;
  assert.equal((await api.getCurrentUser(token)).outcome, "unauthorized");
  anonymous = false;
  assert.equal((await api.getCurrentUser("invalid-token")).outcome, "unauthorized");
  for (const [error, outcome] of [
    [{ status: 429 }, "rate_limited"],
    [{ code: "invalid_credentials" }, "unauthorized"],
    [{ code: "email_not_confirmed" }, "unauthorized"],
    [{ status: 500 }, "unavailable"],
  ] as const) {
    authError = error;
    assert.equal((await api.login(credentials)).outcome, outcome);
  }
  assert.equal(revoked, 2);
});
