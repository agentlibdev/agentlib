import assert from "node:assert/strict";
import test from "node:test";
import { validateManifest } from "@agentlibdev/agent-schema";
import { unzipSync } from "fflate";

import { createApp } from "../src/create-app.js";
import { InMemoryAgentRepository } from "../src/in-memory-agent-repository.js";

const authenticatedHeaders = {
  "content-type": "application/json",
  "x-agentlib-auth-provider": "github",
  "x-agentlib-auth-subject": "123456",
  "x-agentlib-auth-handle": "raul",
  "x-agentlib-auth-name": "Raul"
};

function createSamplePublishRequest(version = "0.3.0") {
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
    compatibility: {
      targets: [
        {
          targetId: "codex",
          builtFor: true,
          tested: true,
          adapterAvailable: true
        },
        {
          targetId: "github-copilot",
          builtFor: true,
          tested: false,
          adapterAvailable: true
        }
      ]
    },
    artifacts: [
      {
        path: "agent.yaml",
        mediaType: "application/yaml",
        content: Buffer.from("apiVersion: agentlib.dev/v1alpha1\nkind: Agent\n").toString("base64")
      },
      {
        path: "README.md",
        mediaType: "text/markdown",
        content: Buffer.from("# Code Reviewer\n").toString("base64")
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
          description: "Reviews pull requests for correctness and maintainability.",
          lifecycleStatus: "active",
          ownerHandle: "raul",
          downloadCount: 0,
          pinCount: 0,
          starCount: 0
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
        description: "Reviews pull requests for correctness and maintainability.",
        lifecycleStatus: "active",
        ownerHandle: "raul",
        downloadCount: 0,
        pinCount: 0,
        starCount: 0
      }
    ],
    page: {
      nextCursor: null
    }
  });
});

test("PATCH /api/v1/agents/:namespace/:name/versions/:version updates version compatibility", async () => {
  const app = createApp({
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
    },
    updateAgentVersionCompatibility: async (namespace, name, version, compatibility, actor) => {
      assert.equal(namespace, "raul");
      assert.equal(name, "code-reviewer");
      assert.equal(version, "0.3.0");
      assert.equal(actor.handle, "raul");
      assert.deepEqual(compatibility, {
        targets: [
          {
            targetId: "codex",
            builtFor: true,
            tested: true,
            adapterAvailable: true
          },
          {
            targetId: "langchain",
            builtFor: false,
            tested: false,
            adapterAvailable: true
          }
        ]
      });

      return {
        namespace: "raul",
        name: "code-reviewer",
        version: "0.3.0",
        title: "Code Reviewer",
        description: "Reviews pull requests for correctness and maintainability.",
        license: "MIT",
        manifestJson: "{\"metadata\":{\"namespace\":\"raul\",\"name\":\"code-reviewer\",\"version\":\"0.3.0\"}}",
        publishedAt: "2026-04-10T10:00:00.000Z",
        lifecycleStatus: "active",
        ownerHandle: "raul",
        authority: {
          namespaceType: "official",
          verificationStatus: "official",
          canonicalNamespace: "raul",
          canonicalName: "code-reviewer",
          claimedByNamespace: null
        },
        provenance: {
          sourceType: "manual",
          sourceUrl: null,
          sourceRepositoryUrl: null,
          originalAuthorHandle: "raul",
          originalAuthorName: "Raul",
          originalAuthorUrl: "https://agentlib.dev/raul",
          submittedByHandle: "raul",
          submittedByName: "Raul"
        },
        compatibility
      };
    }
  });

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/agents/raul/code-reviewer/versions/0.3.0", {
      method: "PATCH",
      headers: authenticatedHeaders,
      body: JSON.stringify({
        compatibility: {
          targets: [
            {
              targetId: "codex",
              builtFor: true,
              tested: true,
              adapterAvailable: true
            },
            {
              targetId: "langchain",
              builtFor: false,
              tested: false,
              adapterAvailable: true
            }
          ]
        }
      })
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    version: {
      namespace: "raul",
      name: "code-reviewer",
      version: "0.3.0",
      title: "Code Reviewer",
      description: "Reviews pull requests for correctness and maintainability.",
      license: "MIT",
      manifestJson: "{\"metadata\":{\"namespace\":\"raul\",\"name\":\"code-reviewer\",\"version\":\"0.3.0\"}}",
      publishedAt: "2026-04-10T10:00:00.000Z",
      lifecycleStatus: "active",
      ownerHandle: "raul",
      authority: {
        namespaceType: "official",
        verificationStatus: "official",
        canonicalNamespace: "raul",
        canonicalName: "code-reviewer",
        claimedByNamespace: null
      },
      provenance: {
        sourceType: "manual",
        sourceUrl: null,
        sourceRepositoryUrl: null,
        originalAuthorHandle: "raul",
        originalAuthorName: "Raul",
        originalAuthorUrl: "https://agentlib.dev/raul",
        submittedByHandle: "raul",
        submittedByName: "Raul"
      },
      compatibility: {
        targets: [
          {
            targetId: "codex",
            builtFor: true,
            tested: true,
            adapterAvailable: true
          },
          {
            targetId: "langchain",
            builtFor: false,
            tested: false,
            adapterAvailable: true
          }
        ]
      }
    }
  });
});

test("GET /api/v1/agents/:namespace/:name returns agent detail", async () => {
  const app = createApp({
    listAgents: async () => ({
      items: [],
      nextCursor: null
    }),
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => null,
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    },
    getAgentDetail: async (_namespace, _name, actor) => ({
      namespace: "raul",
      name: "code-reviewer",
      latestVersion: "0.1.0",
      lifecycleStatus: "active",
      ownerHandle: "raul",
      authority: {
        namespaceType: "official",
        verificationStatus: "official",
        canonicalNamespace: "raul",
        canonicalName: "code-reviewer",
        claimedByNamespace: null
      },
      provenance: {
        sourceType: "manual",
        sourceUrl: null,
        sourceRepositoryUrl: null,
        originalAuthorHandle: "raul",
        originalAuthorName: "Raul",
        originalAuthorUrl: "https://agentlib.dev/raul",
        submittedByHandle: "raul",
        submittedByName: "Raul"
      },
      compatibility: {
        targets: [
          {
            targetId: "codex",
            builtFor: true,
            tested: true,
            adapterAvailable: true
          },
          {
            targetId: "openclaw",
            builtFor: false,
            tested: false,
            adapterAvailable: true
          }
        ]
      },
      downloadCount: 42,
      pinCount: 7,
      starCount: 15,
      viewer: {
        hasPinned: actor?.handle === "raul",
        hasStarred: actor?.handle === "raul"
      },
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
      latestVersion: "0.1.0",
      lifecycleStatus: "active",
      ownerHandle: "raul",
      authority: {
        namespaceType: "official",
        verificationStatus: "official",
        canonicalNamespace: "raul",
        canonicalName: "code-reviewer",
        claimedByNamespace: null
      },
      provenance: {
        sourceType: "manual",
        sourceUrl: null,
        sourceRepositoryUrl: null,
        originalAuthorHandle: "raul",
        originalAuthorName: "Raul",
        originalAuthorUrl: "https://agentlib.dev/raul",
        submittedByHandle: "raul",
        submittedByName: "Raul"
      },
      compatibility: {
        targets: [
          {
            targetId: "codex",
            builtFor: true,
            tested: true,
            adapterAvailable: true
          },
          {
            targetId: "openclaw",
            builtFor: false,
            tested: false,
            adapterAvailable: true
          }
        ]
      },
      downloadCount: 42,
      pinCount: 7,
      starCount: 15,
      viewer: {
        hasPinned: false,
        hasStarred: false
      }
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

test("GET /api/v1/agents/:namespace/:name includes viewer social state for the authenticated user", async () => {
  const app = createApp({
    listAgents: async () => ({
      items: [],
      nextCursor: null
    }),
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => null,
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    },
    getAgentDetail: async (_namespace, _name, actor) => ({
      namespace: "raul",
      name: "code-reviewer",
      latestVersion: "0.1.0",
      lifecycleStatus: "active",
      ownerHandle: "raul",
      authority: {
        namespaceType: "official",
        verificationStatus: "official",
        canonicalNamespace: "raul",
        canonicalName: "code-reviewer",
        claimedByNamespace: null
      },
      provenance: {
        sourceType: "manual",
        sourceUrl: null,
        sourceRepositoryUrl: null,
        originalAuthorHandle: "raul",
        originalAuthorName: "Raul",
        originalAuthorUrl: "https://agentlib.dev/raul",
        submittedByHandle: "raul",
        submittedByName: "Raul"
      },
      compatibility: {
        targets: [
          {
            targetId: "codex",
            builtFor: true,
            tested: true,
            adapterAvailable: true
          }
        ]
      },
      downloadCount: 42,
      pinCount: 7,
      starCount: 15,
      viewer: {
        hasPinned: actor?.handle === "raul",
        hasStarred: actor?.handle === "raul"
      },
      versions: []
    })
  });

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/agents/raul/code-reviewer", {
      headers: authenticatedHeaders
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    agent: {
      namespace: "raul",
      name: "code-reviewer",
      latestVersion: "0.1.0",
      lifecycleStatus: "active",
      ownerHandle: "raul",
      authority: {
        namespaceType: "official",
        verificationStatus: "official",
        canonicalNamespace: "raul",
        canonicalName: "code-reviewer",
        claimedByNamespace: null
      },
      provenance: {
        sourceType: "manual",
        sourceUrl: null,
        sourceRepositoryUrl: null,
        originalAuthorHandle: "raul",
        originalAuthorName: "Raul",
        originalAuthorUrl: "https://agentlib.dev/raul",
        submittedByHandle: "raul",
        submittedByName: "Raul"
      },
      compatibility: {
        targets: [
          {
            targetId: "codex",
            builtFor: true,
            tested: true,
            adapterAvailable: true
          }
        ]
      },
      downloadCount: 42,
      pinCount: 7,
      starCount: 15,
      viewer: {
        hasPinned: true,
        hasStarred: true
      }
    },
    versions: []
  });
});

test("GET /api/v1/agents/:namespace/:name returns 404 for an unknown agent", async () => {
  const app = createApp({
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

test("GET /api/v1/agents/:namespace/:name/versions returns version history", async () => {
  const app = createApp({
    listAgents: async () => ({
      items: [],
      nextCursor: null
    }),
    getAgentDetail: async () => null,
    listAgentVersions: async () => [
      {
        version: "0.2.0",
        title: "Code Reviewer",
        description: "Reviews pull requests for correctness and maintainability.",
        publishedAt: "2026-03-11T10:00:00.000Z"
      },
      {
        version: "0.1.0",
        title: "Code Reviewer",
        description: "Reviews pull requests for correctness and maintainability.",
        publishedAt: "2026-03-10T10:00:00.000Z"
      }
    ],
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => null,
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    }
  });

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/agents/raul/code-reviewer/versions")
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    items: [
      {
        version: "0.2.0",
        title: "Code Reviewer",
        description: "Reviews pull requests for correctness and maintainability.",
        publishedAt: "2026-03-11T10:00:00.000Z"
      },
      {
        version: "0.1.0",
        title: "Code Reviewer",
        description: "Reviews pull requests for correctness and maintainability.",
        publishedAt: "2026-03-10T10:00:00.000Z"
      }
    ]
  });
});

test("GET /api/v1/agents/:namespace/:name/versions/:version returns one version detail", async () => {
  const app = createApp({
    listAgents: async () => ({
      items: [],
      nextCursor: null
    }),
    getAgentDetail: async () => null,
    listAgentVersions: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => null,
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    },
    getAgentVersionDetail: async () => ({
      namespace: "raul",
      name: "code-reviewer",
      version: "0.2.0",
      title: "Code Reviewer",
      description: "Reviews pull requests for correctness and maintainability.",
      license: "MIT",
      manifestJson: "{\"metadata\":{\"namespace\":\"raul\",\"name\":\"code-reviewer\",\"version\":\"0.2.0\"}}",
      publishedAt: "2026-03-11T10:00:00.000Z",
      lifecycleStatus: "active",
      ownerHandle: "raul",
      authority: {
        namespaceType: "official",
        verificationStatus: "official",
        canonicalNamespace: "raul",
        canonicalName: "code-reviewer",
        claimedByNamespace: null
      },
      provenance: {
        sourceType: "manual",
        sourceUrl: null,
        sourceRepositoryUrl: null,
        originalAuthorHandle: "raul",
        originalAuthorName: "Raul",
        originalAuthorUrl: "https://agentlib.dev/raul",
        submittedByHandle: "raul",
        submittedByName: "Raul"
      },
      compatibility: {
        targets: [
          {
            targetId: "codex",
            builtFor: true,
            tested: true,
            adapterAvailable: true
          },
          {
            targetId: "langchain",
            builtFor: false,
            tested: false,
            adapterAvailable: true
          }
        ]
      }
    })
  });

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/agents/raul/code-reviewer/versions/0.2.0")
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    version: {
      namespace: "raul",
      name: "code-reviewer",
      version: "0.2.0",
      title: "Code Reviewer",
      description: "Reviews pull requests for correctness and maintainability.",
      license: "MIT",
      manifestJson: "{\"metadata\":{\"namespace\":\"raul\",\"name\":\"code-reviewer\",\"version\":\"0.2.0\"}}",
      publishedAt: "2026-03-11T10:00:00.000Z",
      lifecycleStatus: "active",
      ownerHandle: "raul",
      authority: {
        namespaceType: "official",
        verificationStatus: "official",
        canonicalNamespace: "raul",
        canonicalName: "code-reviewer",
        claimedByNamespace: null
      },
      provenance: {
        sourceType: "manual",
        sourceUrl: null,
        sourceRepositoryUrl: null,
        originalAuthorHandle: "raul",
        originalAuthorName: "Raul",
        originalAuthorUrl: "https://agentlib.dev/raul",
        submittedByHandle: "raul",
        submittedByName: "Raul"
      },
      compatibility: {
        targets: [
          {
            targetId: "codex",
            builtFor: true,
            tested: true,
            adapterAvailable: true
          },
          {
            targetId: "langchain",
            builtFor: false,
            tested: false,
            adapterAvailable: true
          }
        ]
      }
    }
  });
});

test("POST /api/v1/publish creates a new agent version", async () => {
  const app = createApp({
    listAgents: async () => ({
      items: [],
      nextCursor: null
    }),
    getAgentDetail: async () => null,
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => null,
    publishAgentVersion: async (payload, actor) => {
      assert.equal(actor.handle, "raul");
      assert.deepEqual(payload.compatibility, {
        targets: [
          {
            targetId: "codex",
            builtFor: true,
            tested: true,
            adapterAvailable: true
          },
          {
            targetId: "github-copilot",
            builtFor: true,
            tested: false,
            adapterAvailable: true
          }
        ]
      });
      return {
      namespace: payload.manifest.metadata.namespace,
      name: payload.manifest.metadata.name,
      version: payload.manifest.metadata.version
      };
    }
  });

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/publish", {
      method: "POST",
      headers: authenticatedHeaders,
      body: JSON.stringify({
        manifest: {
          apiVersion: "agentlib.dev/v1alpha1",
          kind: "Agent",
          metadata: {
            namespace: "raul",
            name: "code-reviewer",
            version: "0.3.0",
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
        compatibility: {
          targets: [
            {
              targetId: "codex",
              builtFor: true,
              tested: true,
              adapterAvailable: true
            },
            {
              targetId: "github-copilot",
              builtFor: true,
              tested: false,
              adapterAvailable: true
            }
          ]
        },
        artifacts: [
          {
            path: "agent.yaml",
            mediaType: "application/yaml",
            content: "Y29udGVudA=="
          }
        ]
      })
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

test("published artifacts are retrievable through the HTTP read routes", async () => {
  const repository = new InMemoryAgentRepository();
  const app = createApp(repository);

  const publishResponse = await app.fetch(
    new Request("https://agentlib.dev/api/v1/publish", {
      method: "POST",
      headers: authenticatedHeaders,
      body: JSON.stringify(createSamplePublishRequest("0.3.1"))
    })
  );

  assert.equal(publishResponse.status, 201);

  const artifactsResponse = await app.fetch(
    new Request("https://agentlib.dev/api/v1/agents/raul/code-reviewer/versions/0.3.1/artifacts")
  );

  assert.equal(artifactsResponse.status, 200);
  assert.deepEqual(await artifactsResponse.json(), {
    items: [
      {
        path: "agent.yaml",
        mediaType: "application/yaml",
        sizeBytes: 46
      },
      {
        path: "README.md",
        mediaType: "text/markdown",
        sizeBytes: 16
      }
    ]
  });

  const downloadResponse = await app.fetch(
    new Request(
      "https://agentlib.dev/api/v1/agents/raul/code-reviewer/versions/0.3.1/artifacts/README.md"
    )
  );

  assert.equal(downloadResponse.status, 200);
  assert.equal(downloadResponse.headers.get("content-type"), "text/markdown");
  assert.equal(await downloadResponse.text(), "# Code Reviewer\n");
});

test("POST /api/v1/publish returns 409 when the version already exists", async () => {
  const app = createApp({
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
      throw new Error("version_exists");
    }
  });

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/publish", {
      method: "POST",
      headers: authenticatedHeaders,
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
          },
          spec: {
            summary: "Reviews pull requests with a focus on correctness and maintainability.",
            inputs: [],
            outputs: [],
            tools: []
          }
        },
        readme: "# Code Reviewer\n",
        artifacts: []
      })
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
  const app = createApp({
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
  });

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/publish", {
      method: "POST",
      headers: authenticatedHeaders,
      body: JSON.stringify({
        manifest: {
          apiVersion: "agentlib.dev/v1alpha1",
          kind: "Agent",
          metadata: {
            namespace: "Raul",
            name: "code-reviewer",
            version: "0.3.0",
            title: "Code Reviewer",
            description: "Reviews pull requests for correctness and maintainability."
          },
          spec: {
            summary: "Reviews pull requests with a focus on correctness and maintainability.",
            inputs: [],
            outputs: [],
            tools: []
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
  const app = createApp({
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
  });

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/publish", {
      method: "POST",
      headers: authenticatedHeaders,
      body: JSON.stringify({
        manifest: {
          apiVersion: "agentlib.dev/v1alpha1",
          kind: "Agent",
          metadata: {
            namespace: "Raul",
            name: "code-reviewer",
            version: "0.3.0",
            title: "Code Reviewer",
            description: "Reviews pull requests for correctness and maintainability."
          },
          spec: {
            summary: "Reviews pull requests with a focus on correctness and maintainability.",
            inputs: [],
            outputs: [],
            tools: []
          }
        },
        readme: "# Code Reviewer\n",
        artifacts: []
      })
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

test("GET /api/v1/session returns the authenticated user from request headers", async () => {
  const app = createApp(new InMemoryAgentRepository());

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/session", {
      headers: authenticatedHeaders
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    session: {
      provider: "github",
      subject: "123456",
      handle: "raul",
      displayName: "Raul"
    }
  });
});

test("GET /api/v1/account returns linked identities and owned agents for the session user", async () => {
  const app = createApp({
    listAgents: async () => ({ items: [], nextCursor: null }),
    getAgentDetail: async () => null,
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => null,
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    },
    getAccountSummary: async (actor) => {
      assert.equal(actor.handle, "raul");
      return {
        user: {
          handle: "raul",
          displayName: "Raul",
          email: "raul@example.com",
          displayLocalTime: false,
          socialLinks: []
        },
        identities: [
          { provider: "github", handle: "raul", email: "raul@example.com" },
          { provider: "google", handle: "raul", email: "raul@example.com" }
        ],
        ownedAgents: [
          {
            namespace: "raul",
            name: "code-reviewer",
            latestVersion: "0.4.0",
            title: "Code Reviewer",
            description: "Reviews pull requests for correctness and maintainability.",
            lifecycleStatus: "active",
            ownerHandle: "raul",
            downloadCount: 28,
            pinCount: 4,
            starCount: 9
          }
        ],
        stats: {
          ownedAgentCount: 1,
          totalDownloads: 28,
          totalPins: 4,
          totalStars: 9
        },
        topAgent: {
          namespace: "raul",
          name: "code-reviewer",
          latestVersion: "0.4.0",
          title: "Code Reviewer",
          description: "Reviews pull requests for correctness and maintainability.",
          lifecycleStatus: "active",
          ownerHandle: "raul",
          downloadCount: 28,
          pinCount: 4,
          starCount: 9
        }
      };
    }
  });

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/account", {
      headers: authenticatedHeaders
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    account: {
      user: {
        handle: "raul",
        displayName: "Raul",
        email: "raul@example.com",
        displayLocalTime: false,
        socialLinks: []
      },
      identities: [
        { provider: "github", handle: "raul", email: "raul@example.com" },
        { provider: "google", handle: "raul", email: "raul@example.com" }
      ],
      ownedAgents: [
        {
          namespace: "raul",
          name: "code-reviewer",
          latestVersion: "0.4.0",
          title: "Code Reviewer",
          description: "Reviews pull requests for correctness and maintainability.",
          lifecycleStatus: "active",
          ownerHandle: "raul",
          downloadCount: 28,
          pinCount: 4,
          starCount: 9
        }
      ],
      stats: {
        ownedAgentCount: 1,
        totalDownloads: 28,
        totalPins: 4,
        totalStars: 9
      },
      topAgent: {
        namespace: "raul",
        name: "code-reviewer",
        latestVersion: "0.4.0",
        title: "Code Reviewer",
        description: "Reviews pull requests for correctness and maintainability.",
        lifecycleStatus: "active",
        ownerHandle: "raul",
        downloadCount: 28,
        pinCount: 4,
        starCount: 9
      }
    }
  });
});

test("POST /api/v1/publish returns 401 when the request is anonymous", async () => {
  const app = createApp(new InMemoryAgentRepository());

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/publish", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(createSamplePublishRequest("0.3.2"))
    })
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: {
      code: "authentication_required",
      message: "Authentication is required for this operation"
    }
  });
});

test("PATCH /api/v1/agents/:namespace/:name updates lifecycle status for the owner", async () => {
  const app = createApp({
    listAgents: async () => ({ items: [], nextCursor: null }),
    getAgentDetail: async () => null,
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => null,
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    },
    updateAgentLifecycle: async (namespace, name, lifecycleStatus, actor) => {
      assert.equal(actor.handle, "raul");
      return {
        namespace,
        name,
        lifecycleStatus
      };
    }
  });

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/agents/raul/code-reviewer", {
      method: "PATCH",
      headers: authenticatedHeaders,
      body: JSON.stringify({
        lifecycleStatus: "deprecated"
      })
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    agent: {
      namespace: "raul",
      name: "code-reviewer",
      lifecycleStatus: "deprecated"
    }
  });
});

test("DELETE /api/v1/agents/:namespace/:name/pins removes a pin idempotently", async () => {
  const app = createApp({
    listAgents: async () => ({ items: [], nextCursor: null }),
    getAgentDetail: async () => null,
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => null,
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    },
    removeAgentPin: async (namespace, name, actor) => {
      assert.equal(namespace, "raul");
      assert.equal(name, "code-reviewer");
      assert.equal(actor.handle, "raul");
      return {
        namespace,
        name,
        downloadCount: 42,
        pinCount: 2,
        starCount: 15
      };
    }
  });

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/agents/raul/code-reviewer/pins", {
      method: "DELETE",
      headers: authenticatedHeaders
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    metrics: {
      namespace: "raul",
      name: "code-reviewer",
      downloadCount: 42,
      pinCount: 2,
      starCount: 15
    }
  });
});

test("DELETE /api/v1/agents/:namespace/:name/stars removes a star idempotently", async () => {
  const app = createApp({
    listAgents: async () => ({ items: [], nextCursor: null }),
    getAgentDetail: async () => null,
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => null,
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    },
    removeAgentStar: async (namespace, name, actor) => {
      assert.equal(namespace, "raul");
      assert.equal(name, "code-reviewer");
      assert.equal(actor.handle, "raul");
      return {
        namespace,
        name,
        downloadCount: 42,
        pinCount: 7,
        starCount: 14
      };
    }
  });

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/agents/raul/code-reviewer/stars", {
      method: "DELETE",
      headers: authenticatedHeaders
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    metrics: {
      namespace: "raul",
      name: "code-reviewer",
      downloadCount: 42,
      pinCount: 7,
      starCount: 14
    }
  });
});

test("POST /api/v1/providers/github/import returns a persisted import draft", async () => {
  const app = createApp({
    listAgents: async () => ({ items: [], nextCursor: null }),
    getAgentDetail: async () => null,
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => null,
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    },
    importGithubRepository: async () => ({
      id: "import_draft_github_123456_main",
      status: "draft",
      provider: "github",
      repository: {
        externalId: "123456",
        url: "https://github.com/raul/code-reviewer",
        owner: "raul",
        name: "code-reviewer",
        defaultBranch: "main",
        resolvedRef: "main"
      },
      manifest: {
        namespace: "raul",
        name: "code-reviewer",
        version: "0.4.0",
        title: "Code Reviewer",
        description: "Reviews pull requests for correctness and maintainability."
      },
      readme: "# Code Reviewer\n",
      artifacts: [
        {
          path: "README.md",
          mediaType: "text/markdown",
          sizeBytes: 16
        },
        {
          path: "agent.md",
          mediaType: "text/markdown",
          sizeBytes: 33
        },
        {
          path: "LICENSE",
          mediaType: "text/plain",
          sizeBytes: 12
        },
        {
          path: "agent.yaml",
          mediaType: "application/yaml",
          sizeBytes: 46
        }
      ],
      sourceRepositoryId: "source_repo_github_123456"
    }),
    getImportDraft: async () => {
      throw new Error("unexpected");
    },
    publishImportDraft: async () => {
      throw new Error("unexpected");
    }
  } as never);

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/providers/github/import", {
      method: "POST",
      headers: authenticatedHeaders,
      body: JSON.stringify({
        repositoryUrl: "https://github.com/raul/code-reviewer"
      })
    })
  );

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    import: {
      id: "import_draft_github_123456_main",
      status: "draft",
      provider: "github",
      repository: {
        externalId: "123456",
        url: "https://github.com/raul/code-reviewer",
        owner: "raul",
        name: "code-reviewer",
        defaultBranch: "main",
        resolvedRef: "main"
      },
      manifest: {
        namespace: "raul",
        name: "code-reviewer",
        version: "0.4.0",
        title: "Code Reviewer",
        description: "Reviews pull requests for correctness and maintainability."
      },
      readme: "# Code Reviewer\n",
      artifacts: [
        {
          path: "README.md",
          mediaType: "text/markdown",
          sizeBytes: 16
        },
        {
          path: "agent.md",
          mediaType: "text/markdown",
          sizeBytes: 33
        },
        {
          path: "LICENSE",
          mediaType: "text/plain",
          sizeBytes: 12
        },
        {
          path: "agent.yaml",
          mediaType: "application/yaml",
          sizeBytes: 46
        }
      ],
      sourceRepositoryId: "source_repo_github_123456"
    }
  });
});

test("GET /api/v1/imports/:id returns draft detail", async () => {
  const app = createApp({
    listAgents: async () => ({ items: [], nextCursor: null }),
    getAgentDetail: async () => null,
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => null,
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    },
    importGithubRepository: async () => {
      throw new Error("unexpected");
    },
    getImportDraft: async () => ({
      id: "import_draft_github_123456_main",
      status: "draft",
      provider: "github",
      repository: {
        externalId: "123456",
        url: "https://github.com/raul/code-reviewer",
        owner: "raul",
        name: "code-reviewer",
        defaultBranch: "main",
        resolvedRef: "main"
      },
      manifest: {
        namespace: "raul",
        name: "code-reviewer",
        version: "0.4.0",
        title: "Code Reviewer",
        description: "Reviews pull requests for correctness and maintainability."
      },
      readme: "# Code Reviewer\n",
      artifacts: [
        {
          path: "README.md",
          mediaType: "text/markdown",
          sizeBytes: 16
        },
        {
          path: "agent.yaml",
          mediaType: "application/yaml",
          sizeBytes: 46
        }
      ],
      sourceRepositoryId: "source_repo_github_123456"
    }),
    publishImportDraft: async () => {
      throw new Error("unexpected");
    }
  } as never);

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/imports/import_draft_github_123456_main")
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    import: {
      id: "import_draft_github_123456_main",
      status: "draft",
      provider: "github",
      repository: {
        externalId: "123456",
        url: "https://github.com/raul/code-reviewer",
        owner: "raul",
        name: "code-reviewer",
        defaultBranch: "main",
        resolvedRef: "main"
      },
      manifest: {
        namespace: "raul",
        name: "code-reviewer",
        version: "0.4.0",
        title: "Code Reviewer",
        description: "Reviews pull requests for correctness and maintainability."
      },
      readme: "# Code Reviewer\n",
      artifacts: [
        {
          path: "README.md",
          mediaType: "text/markdown",
          sizeBytes: 16
        },
        {
          path: "agent.yaml",
          mediaType: "application/yaml",
          sizeBytes: 46
        }
      ],
      sourceRepositoryId: "source_repo_github_123456"
    }
  });
});

test("POST /api/v1/imports/:id/publish publishes a draft manually", async () => {
  const app = createApp({
    listAgents: async () => ({ items: [], nextCursor: null }),
    getAgentDetail: async () => null,
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => null,
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    },
    importGithubRepository: async () => {
      throw new Error("unexpected");
    },
    getImportDraft: async () => {
      throw new Error("unexpected");
    },
    publishImportDraft: async () => ({
      namespace: "raul",
      name: "code-reviewer",
      version: "0.4.0"
    })
  } as never);

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/imports/import_draft_github_123456_main/publish", {
      method: "POST",
      headers: authenticatedHeaders
    })
  );

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    agent: {
      namespace: "raul",
      name: "code-reviewer",
      version: "0.4.0"
    }
  });
});

test("POST /api/v1/providers/github/import returns 400 for an invalid payload", async () => {
  const app = createApp({
    listAgents: async () => ({ items: [], nextCursor: null }),
    getAgentDetail: async () => null,
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => null,
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    },
    importGithubRepository: async () => {
      throw new Error("unexpected");
    }
  } as never);

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/providers/github/import", {
      method: "POST",
      headers: authenticatedHeaders,
      body: JSON.stringify({
        repositoryUrl: "https://gitlab.com/raul/code-reviewer"
      })
    })
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: {
      code: "unsupported_repository_url",
      message: "Repository URL is not a supported GitHub repository"
    }
  });
});

test("POST /api/v1/providers/github/import returns 422 for a schema-invalid manifest", async () => {
  const app = createApp({
    listAgents: async () => ({ items: [], nextCursor: null }),
    getAgentDetail: async () => null,
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => null,
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    },
    importGithubRepository: async () => {
      throw new Error("invalid_manifest");
    }
  } as never);

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/providers/github/import", {
      method: "POST",
      headers: authenticatedHeaders,
      body: JSON.stringify({
        repositoryUrl: "https://github.com/raul/code-reviewer",
        ref: "main"
      })
    })
  );

  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), {
    error: {
      code: "invalid_manifest",
      message: "Imported manifest failed schema validation"
    }
  });
});

test("POST /api/v1/providers/github/import returns 502 for a GitHub rate limit", async () => {
  const app = createApp({
    listAgents: async () => ({ items: [], nextCursor: null }),
    getAgentDetail: async () => null,
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => null,
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    },
    importGithubRepository: async () => {
      throw new Error("github_rate_limited");
    }
  } as never);

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/providers/github/import", {
      method: "POST",
      headers: authenticatedHeaders,
      body: JSON.stringify({
        repositoryUrl: "https://github.com/raul/code-reviewer",
        ref: "main"
      })
    })
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: {
      code: "github_rate_limited",
      message: "GitHub rate limit exceeded during import"
    }
  });
});

test("schema validation accepts the publish smoke manifest shape", () => {
  assert.equal(
    validateManifest({
      apiVersion: "agentlib.dev/v1alpha1",
      kind: "Agent",
      metadata: {
        namespace: "raul",
        name: "code-reviewer",
        version: "0.3.1",
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
    }),
    true
  );
});

test("GET /api/v1/agents/:namespace/:name/versions/:version/artifacts returns artifact metadata", async () => {
  const app = createApp({
    listAgents: async () => ({ items: [], nextCursor: null }),
    getAgentDetail: async () => null,
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => [
      {
        path: "agent.yaml",
        mediaType: "application/yaml",
        sizeBytes: 744
      },
      {
        path: "README.md",
        mediaType: "text/markdown",
        sizeBytes: 287
      }
    ],
    getArtifactContent: async () => null,
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    }
  });

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/agents/raul/docs-writer/versions/0.1.0/artifacts")
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    items: [
      {
        path: "agent.yaml",
        mediaType: "application/yaml",
        sizeBytes: 744
      },
      {
        path: "README.md",
        mediaType: "text/markdown",
        sizeBytes: 287
      }
    ]
  });
});

test("GET /api/v1/agents/:namespace/:name/versions/:version/artifacts/:path downloads artifact content", async () => {
  const app = createApp({
    listAgents: async () => ({ items: [], nextCursor: null }),
    getAgentDetail: async () => null,
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => ({
      path: "README.md",
      mediaType: "text/markdown",
      content: new TextEncoder().encode("# docs-writer\n").buffer
    }),
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    }
  });

  const response = await app.fetch(
    new Request(
      "https://agentlib.dev/api/v1/agents/raul/docs-writer/versions/0.1.0/artifacts/README.md"
    )
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/markdown");
  assert.equal(await response.text(), "# docs-writer\n");
});

test("GET /api/v1/agents/:namespace/:name/versions/:version/artifacts/:path returns 404 for an unknown artifact", async () => {
  const app = createApp({
    listAgents: async () => ({ items: [], nextCursor: null }),
    getAgentDetail: async () => null,
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => null,
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    }
  });

  const response = await app.fetch(
    new Request(
      "https://agentlib.dev/api/v1/agents/raul/docs-writer/versions/0.1.0/artifacts/missing.txt"
    )
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: {
      code: "artifact_not_found",
      message: "Artifact not found"
    }
  });
});

test("GET /api/v1/agents/:namespace/:name/versions/:version/artifacts/:path/content returns a text preview payload", async () => {
  const app = createApp({
    listAgents: async () => ({ items: [], nextCursor: null }),
    getAgentDetail: async () => null,
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => ({
      path: "README.md",
      mediaType: "text/markdown",
      content: new TextEncoder().encode("# docs-writer\n").buffer
    }),
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    }
  });

  const response = await app.fetch(
    new Request(
      "https://agentlib.dev/api/v1/agents/raul/docs-writer/versions/0.1.0/artifacts/README.md/content"
    )
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    artifact: {
      path: "README.md",
      mediaType: "text/markdown",
      sizeBytes: 14
    },
    preview: {
      kind: "markdown",
      text: "# docs-writer\n"
    }
  });
});

test("GET /api/v1/agents/:namespace/:name/versions/:version/artifacts/:path/content rejects binary preview", async () => {
  const app = createApp({
    listAgents: async () => ({ items: [], nextCursor: null }),
    getAgentDetail: async () => null,
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => ({
      path: "logo.png",
      mediaType: "image/png",
      content: Uint8Array.from([137, 80, 78, 71]).buffer
    }),
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    }
  });

  const response = await app.fetch(
    new Request(
      "https://agentlib.dev/api/v1/agents/raul/docs-writer/versions/0.1.0/artifacts/logo.png/content"
    )
  );

  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), {
    error: {
      code: "artifact_preview_not_supported",
      message: "Artifact preview is only available for text-based files"
    }
  });
});

test("GET /api/v1/agents/:namespace/:name/versions/:version/download.zip returns a full artifact archive", async () => {
  let downloadRecorded = false;

  const app = createApp({
    listAgents: async () => ({ items: [], nextCursor: null }),
    getAgentDetail: async () => null,
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => null,
    listArtifactContents: async () => [
      {
        path: "README.md",
        mediaType: "text/markdown",
        content: new TextEncoder().encode("# docs-writer\n").buffer
      },
      {
        path: "agent.json",
        mediaType: "application/json",
        content: new TextEncoder().encode('{"name":"docs-writer"}').buffer
      }
    ],
    recordAgentDownload: async () => {
      downloadRecorded = true;
      return {
        namespace: "raul",
        name: "docs-writer",
        downloadCount: 1,
        pinCount: 0,
        starCount: 0
      };
    },
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    }
  });

  const response = await app.fetch(
    new Request("https://agentlib.dev/api/v1/agents/raul/docs-writer/versions/0.1.0/download.zip")
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/zip");
  assert.match(
    response.headers.get("content-disposition") ?? "",
    /attachment; filename="raul-docs-writer-0\.1\.0\.zip"/
  );
  assert.equal(downloadRecorded, true);

  const archive = unzipSync(new Uint8Array(await response.arrayBuffer()));
  assert.equal(new TextDecoder().decode(archive["README.md"]), "# docs-writer\n");
  assert.equal(new TextDecoder().decode(archive["agent.json"]), '{"name":"docs-writer"}');
});
