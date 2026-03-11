import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../src/create-app.js";

test("GET /api/v1/agents returns a paginated agent list", async () => {
  const app = createApp({
    listAgents: async () => ({
      items: [
        {
          namespace: "raul",
          name: "code-reviewer",
          latestVersion: "0.1.0",
          title: "Code Reviewer",
          description: "Reviews pull requests for correctness and maintainability."
        }
      ],
      nextCursor: null
    }),
    getAgentDetail: async () => null
  });

  const response = await app.fetch(new Request("https://agentlib.dev/api/v1/agents"));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    items: [
      {
        namespace: "raul",
        name: "code-reviewer",
        latestVersion: "0.1.0",
        title: "Code Reviewer",
        description: "Reviews pull requests for correctness and maintainability."
      }
    ],
    page: {
      nextCursor: null
    }
  });
});

test("GET /api/v1/agents/:namespace/:name returns agent detail", async () => {
  const app = createApp({
    listAgents: async () => ({
      items: [],
      nextCursor: null
    }),
    getAgentDetail: async () => ({
      namespace: "raul",
      name: "code-reviewer",
      latestVersion: "0.1.0",
      versions: [
        {
          version: "0.1.0",
          title: "Code Reviewer",
          description: "Reviews pull requests for correctness and maintainability.",
          publishedAt: "2026-03-11T00:00:00.000Z"
        }
      ]
    })
  });

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/agents/raul/code-reviewer")
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    agent: {
      namespace: "raul",
      name: "code-reviewer",
      latestVersion: "0.1.0"
    },
    versions: [
      {
        version: "0.1.0",
        title: "Code Reviewer",
        description: "Reviews pull requests for correctness and maintainability.",
        publishedAt: "2026-03-11T00:00:00.000Z"
      }
    ]
  });
});

test("GET /api/v1/agents/:namespace/:name returns 404 for an unknown agent", async () => {
  const app = createApp({
    listAgents: async () => ({
      items: [],
      nextCursor: null
    }),
    getAgentDetail: async () => null
  });

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/agents/raul/missing-agent")
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: {
      code: "agent_not_found",
      message: "Agent not found"
    }
  });
});
