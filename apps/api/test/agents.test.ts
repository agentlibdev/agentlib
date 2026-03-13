import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../src/create-app.js";

function createStubRepository() {
  return {
    listAgents: async () => ({
      items: [],
      nextCursor: null
    }),
    getAgentDetail: async () => null,
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => null,
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    }
  };
}

function createPublishRequest(version = "0.3.0") {
  return {
    manifest: {
      apiVersion: "agentlib.dev/v1alpha1",
      kind: "Agent",
      metadata: {
        namespace: "raul",
        name: "code-reviewer",
        version,
        title: "Code Reviewer",
        description: "Reviews pull requests for correctness and maintainability.",
        license: "MIT"
      },
      spec: {
        summary: "Reviews pull requests with a focus on correctness and maintainability.",
        inputs: [],
        outputs: [],
        tools: []
      }
    },
    readme: "# Code Reviewer\n",
    artifacts: [
      {
        path: "agent.yaml",
        mediaType: "application/yaml",
        content: "Y29udGVudA=="
      }
    ]
  };
}

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
    getAgentDetail: async () => null,
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => null,
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    }
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
    }),
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => null,
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    }
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
  const app = createApp(createStubRepository());

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

test("POST /api/v1/publish creates a new agent version", async () => {
  const app = createApp({
    ...createStubRepository(),
    publishAgentVersion: async (payload) => ({
      namespace: payload.manifest.metadata.namespace,
      name: payload.manifest.metadata.name,
      version: payload.manifest.metadata.version
    })
  });

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/publish", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(createPublishRequest())
    })
  );

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    agent: {
      namespace: "raul",
      name: "code-reviewer",
      version: "0.3.0"
    }
  });
});

test("POST /api/v1/publish returns 409 when the version already exists", async () => {
  const app = createApp({
    ...createStubRepository(),
    publishAgentVersion: async () => {
      throw new Error("version_exists");
    }
  });

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/publish", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(createPublishRequest())
    })
  );

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    error: {
      code: "version_exists",
      message: "Agent version already exists"
    }
  });
});

test("POST /api/v1/publish returns 400 for an invalid payload", async () => {
  const app = createApp(createStubRepository());

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/publish", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        manifest: {
          apiVersion: "agentlib.dev/v1alpha1",
          kind: "Agent",
          metadata: {
            namespace: "raul",
            name: "code-reviewer",
            version: "0.3.0",
            title: "Code Reviewer",
            description: "Reviews pull requests for correctness and maintainability."
          }
        }
      })
    })
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: {
      code: "invalid_publish_request",
      message: "Publish request is invalid"
    }
  });
});

test("POST /api/v1/publish returns 400 for a schema-invalid manifest", async () => {
  const app = createApp(createStubRepository());
  const payload = createPublishRequest();
  payload.manifest.metadata.namespace = "Raul";

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/publish", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    })
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: {
      code: "invalid_manifest",
      message: "Manifest failed schema validation"
    }
  });
});
