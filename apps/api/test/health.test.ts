import assert from "node:assert/strict";
import test from "node:test";

import { handleRequest } from "../src/index.js";

test("GET /health returns ok status payload", async () => {
  const response = await handleRequest(new Request("https://agentlib.dev/health"));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.deepEqual(await response.json(), {
    ok: true,
    service: "agentlib-api"
  });
});

test("unknown routes return explicit JSON 404 errors", async () => {
  const response = await handleRequest(new Request("https://agentlib.dev/unknown"));

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.deepEqual(await response.json(), {
    error: {
      code: "not_found",
      message: "Route not found"
    }
  });
});
