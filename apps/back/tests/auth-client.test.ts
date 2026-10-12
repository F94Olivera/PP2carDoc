import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const token = (iat: unknown) => `header.${btoa(JSON.stringify({ iat }))}.signature`;
const freshToken = () => token(Math.floor(Date.now() / 1000));

type Session = { access_token: string } | null;
const loadClient = async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const events: string[] = [];
  let session: Session = { access_token: freshToken() };
  let refreshError: object | null = null;
  let response = new Response(null, { status: 204 });
  let refreshes = 0;
  let cleanups = 0;
  const auth = {
    getSession: async () => ({ data: { session }, error: null }),
    refreshSession: async () => {
      refreshes++;
      await Promise.resolve();
      session = refreshError ? null : { access_token: freshToken() };
      return { data: { session }, error: refreshError };
    },
    signOut: async (options: unknown) => {
      assert.deepEqual(options, { scope: "local" });
      cleanups++;
      return { error: null };
    },
  };
  const bundle = await build({
    stdin: {
      contents: [
        "../../front/app/lib/auth-client.ts",
        "../../front/app/(app)/finances/finance-api.ts",
        "../../front/app/(app)/budget/budget-api.ts",
      ]
        .map((path) => `export * from ${JSON.stringify(new URL(path, import.meta.url).pathname)};`)
        .join("\n"),
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    format: "cjs",
    platform: "node",
    plugins: [
      {
        name: "auth-double",
        setup(builder) {
          builder.onResolve({ filter: /supabase\/client$/ }, () => ({
            path: "auth",
            namespace: "double",
          }));
          builder.onLoad({ filter: /.*/, namespace: "double" }, () => ({
            contents: "export const createClient = () => ({ auth });",
          }));
        },
      },
    ],
  });
  const module = { exports: {} };
  new Function("module", "exports", "auth", "fetch", "window", bundle.outputFiles[0]!.text)(
    module,
    module.exports,
    auth,
    async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return response.clone();
    },
    { dispatchEvent: (event: Event) => events.push(event.type) },
  );
  const api = module.exports as {
    fetchAuthenticated(path: string, init?: RequestInit): Promise<Response>;
    getErrorMessage(response: Response, fallback: string): Promise<string>;
    signOut(): Promise<void>;
    getFinances(input: {
      startDate: string;
      endDate: string;
      fallbackError: string;
    }): Promise<unknown>;
    createBudgetPdf(payload: unknown, fallbackError: string): Promise<Response>;
  };
  return {
    api,
    calls,
    events,
    setSession: (value: Session) => {
      session = value;
    },
    failRefresh: () => {
      refreshError = { message: "revoked" };
    },
    setResponse: (value: Response) => {
      response = value;
    },
    counts: () => ({ refreshes, cleanups }),
  };
};

test("authenticated transport preserves PDF headers and body, adds Bearer and omits cookies", async () => {
  const { api, calls, counts } = await loadClient();
  await api.fetchAuthenticated("/budgets/pdf", {
    method: "POST",
    body: "{}",
    headers: { Accept: "application/pdf", "Content-Type": "application/json" },
    credentials: "include",
  });
  const request = calls[0]!;
  const headers = new Headers(request.init.headers);
  assert.ok(request.url.endsWith("/budgets/pdf"));
  assert.match(headers.get("Authorization")!, /^Bearer /);
  assert.equal(headers.get("Accept"), "application/pdf");
  assert.equal(headers.get("Content-Type"), "application/json");
  assert.equal(headers.get("x-region"), "us-west-2");
  assert.equal(request.init.credentials, "omit");
  assert.equal(request.init.cache, "no-store");
  assert.equal(request.init.body, "{}");
  assert.equal(counts().refreshes, 0);
});

test("concurrent requests share renewal before the API's fifteen minute limit", async () => {
  const state = await loadClient();
  state.setSession({ access_token: token(Math.floor(Date.now() / 1000) - 875) });
  await Promise.all([state.api.fetchAuthenticated("/a"), state.api.fetchAuthenticated("/b")]);
  assert.equal(state.counts().refreshes, 1);
  assert.equal(state.calls.length, 2);
  assert.equal(
    new Headers(state.calls[0]!.init.headers).get("Authorization"),
    new Headers(state.calls[1]!.init.headers).get("Authorization"),
  );
});

test("malformed, missing and future issue times trigger renewal", async () => {
  for (const access_token of [
    "invalid",
    token(null),
    token("123"),
    token(Date.now() / 1000 + 100),
  ]) {
    const state = await loadClient();
    state.setSession({ access_token });
    await state.api.fetchAuthenticated("/a");
    assert.equal(state.counts().refreshes, 1);
  }
});

test("missing or revoked sessions never send an API request", async () => {
  for (const revoked of [false, true]) {
    const state = await loadClient();
    state.setSession(revoked ? { access_token: "invalid" } : null);
    if (revoked) state.failRefresh();
    await assert.rejects(state.api.fetchAuthenticated("/a"), /Authentication required/);
    assert.equal(state.calls.length, 0);
    assert.deepEqual(state.events, ["cardoc:auth-expired"]);
    // A later login must not retain a failed pending promise.
    state.setSession({ access_token: freshToken() });
    await state.api.fetchAuthenticated("/a");
    assert.equal(state.calls.length, 1);
  }
});

test("401 signals expiration once at transport without retrying mutations", async () => {
  const state = await loadClient();
  state.setResponse(new Response('{"error":"revoked"}', { status: 401 }));
  assert.equal((await state.api.fetchAuthenticated("/a", { method: "POST" })).status, 401);
  assert.equal(state.calls.length, 1);
  assert.deepEqual(state.events, ["cardoc:auth-expired"]);
});

test("errors use the shared error string and tolerate invalid bodies", async () => {
  const { api } = await loadClient();
  for (const [body, expected] of [
    ['{"error":"conflict"}', "conflict"],
    ['{"message":"legacy"}', "fallback"],
    ['{"error":7}', "fallback"],
    ['{"error":" "}', "fallback"],
    ["null", "fallback"],
    ["not json", "fallback"],
  ]) {
    assert.equal(await api.getErrorMessage(new Response(body), "fallback"), expected);
  }
});

test("logout revokes via API then clears local session; failures do not confirm success", async () => {
  for (const status of [204, 401, 429, 503]) {
    const state = await loadClient();
    state.setResponse(new Response(null, { status }));
    if (status === 204 || status === 401) await state.api.signOut();
    else await assert.rejects(state.api.signOut(), /Could not sign out/);
    assert.ok(state.calls[0]!.url.endsWith("/logout"));
    assert.equal(state.calls[0]!.init.method, "POST");
    assert.equal(state.counts().cleanups, status === 204 || status === 401 ? 1 : 0);
  }
});

test("finance and PDF domain clients use authenticated transport and propagate API errors", async () => {
  const state = await loadClient();
  state.setResponse(
    new Response('{"total":0}', { headers: { "Content-Type": "application/json" } }),
  );
  assert.deepEqual(
    await state.api.getFinances({
      startDate: "2026-10-01",
      endDate: "2026-10-17",
      fallbackError: "failed",
    }),
    { total: 0 },
  );
  assert.match(state.calls[0]!.url, /finances\?endDate=2026-10-17&startDate=2026-10-01/);
  assert.match(new Headers(state.calls[0]!.init.headers).get("Authorization")!, /^Bearer /);
  state.setResponse(
    new Response("fake PDF", {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="budget.pdf"',
      },
    }),
  );
  const pdf = await state.api.createBudgetPdf({ templateId: "classic" }, "failed");
  assert.equal(await pdf.text(), "fake PDF");
  assert.equal(pdf.headers.get("Content-Disposition"), 'attachment; filename="budget.pdf"');
  assert.equal(new Headers(state.calls[1]!.init.headers).get("Accept"), "application/pdf");
  state.setResponse(new Response('{"error":"unavailable"}', { status: 503 }));
  await assert.rejects(state.api.createBudgetPdf({}, "failed"), /unavailable/);
  state.setResponse(new Response('{"error":"expired"}', { status: 401 }));
  await assert.rejects(
    state.api.getFinances({ startDate: "", endDate: "", fallbackError: "failed" }),
    /expired/,
  );
  assert.deepEqual(state.events, ["cardoc:auth-expired"]);
});
