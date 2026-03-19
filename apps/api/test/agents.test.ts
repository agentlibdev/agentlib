import assert from "node:assert/strict";
import test from "node:test";
import { validateManifest } from "@agentlibdev/agent-schema";

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
    listAgentVersions: async () => null,
    getAgentVersionDetail: async () => null,
    listArtifacts: async () => null,
    getArtifactContent: async () => null,
    publishAgentVersion: async () => {
      throw new Error("unexpected");
    },
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
      publishedAt: "2026-03-11T10:00:00.000Z"
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
      publishedAt: "2026-03-11T10:00:00.000Z"
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
      headers: {
        "content-type": "application/json"
      },
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
      headers: {
        "content-type": "application/json"
      },
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
      headers: {
        "content-type": "application/json"
      },
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
      method: "POST"
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
      headers: {
        "content-type": "application/json"
      },
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
      headers: {
        "content-type": "application/json"
      },
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
      headers: {
        "content-type": "application/json"
      },
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
