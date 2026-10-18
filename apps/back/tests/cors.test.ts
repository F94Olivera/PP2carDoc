import assert from "node:assert/strict";
import { test } from "node:test";
import { corsMiddleware } from "../src/middlewares/cors-middleware.js";

test("preflight caches only CORS permission for ten minutes and never continues to auth", () => {
  const headers = new Map<string, string>();
  let status = 0;
  let ended = false;
  const response = {
    setHeader: (name: string, value: string) => headers.set(name, value),
    status(code: number) {
      status = code;
      return this;
    },
    end() {
      ended = true;
    },
  };
  corsMiddleware({ method: "OPTIONS" } as never, response as never, () =>
    assert.fail("preflight next"),
  );
  assert.equal(status, 204);
  assert.equal(ended, true);
  assert.equal(headers.get("Access-Control-Max-Age"), "600");
  assert.match(headers.get("Access-Control-Allow-Headers")!, /authorization/);
  assert.match(headers.get("Access-Control-Allow-Headers")!, /x-region/);
  assert.equal(headers.has("Access-Control-Allow-Credentials"), false);
  for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
    headers.clear();
    let continued = false;
    corsMiddleware({ method } as never, response as never, () => {
      continued = true;
    });
    assert.equal(continued, true, method);
    assert.equal(headers.has("Access-Control-Max-Age"), false, method);
    assert.equal(headers.has("Cache-Control"), false, method);
  }
});
