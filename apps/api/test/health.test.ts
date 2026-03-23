import assert from "node:assert/strict";
import test from "node:test";

import worker, { handleRequest } from "../src/index.js";

test("GET /health returns ok status payload", async () => {
  const response = await handleRequest(new Request("https://agentlib.dev/health"));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.deepEqual(await response.json(), {
    ok: true,
    service: "agentlib-api"
  });
});

test("unknown API routes return explicit JSON 404 errors", async () => {
  const response = await handleRequest(new Request("https://agentlib.dev/api/v1/unknown"));

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.deepEqual(await response.json(), {
    error: {
      code: "not_found",
      message: "Route not found"
    }
  });
});

test("non-api routes fall back to Cloudflare assets when available", async () => {
  let fetchedPath = "";
  const response = await worker.fetch!(
    new Request("https://agentlib.dev/imports/new") as Request<unknown, IncomingRequestCfProperties<unknown>>,
    {
      ASSETS: {
        fetch(request: Request) {
          fetchedPath = new URL(request.url).pathname;
          return Promise.resolve(
            new Response("<!doctype html><html><body>web</body></html>", {
              headers: {
                "content-type": "text/html"
              }
            })
          );
        },
        connect() {
          throw new Error("not_implemented");
        }
      }
    },
    {} as ExecutionContext
  );

  assert.equal(fetchedPath, "/imports/new");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/html");
  assert.match(await response.text(), /<body>web<\/body>/);
});
