import assert from "node:assert/strict";
import test from "node:test";

import { D1AgentRepository } from "../src/d1-agent-repository.js";
import type { ArtifactStorage, StoredArtifact } from "../../../packages/storage/src/artifact-storage.js";
import type { GithubClient } from "../../../packages/providers/src/github-client.js";

type StatementResult<Row> = {
  results: Row[];
};

class FakePreparedStatement<Row> {
  private boundArgs: unknown[] = [];

  constructor(
    private readonly sql: string,
    private readonly result: StatementResult<Row>,
    private readonly runs: Array<{ sql: string; args: unknown[] }>
  ) {}

  bind(...args: unknown[]): FakePreparedStatement<Row> {
    this.boundArgs = args;
    return this;
  }

  async all(): Promise<StatementResult<Row>> {
    return this.result;
  }

  async run(): Promise<{ success: true }> {
    this.runs.push({
      sql: this.sql,
      args: this.boundArgs
    });
    return { success: true };
  }
}

class FakeDatabase {
  readonly runs: Array<{ sql: string; args: unknown[] }> = [];

  constructor(
    private readonly handlers: Record<string, StatementResult<Record<string, unknown>>>
  ) {}

  prepare(sql: string): FakePreparedStatement<Record<string, unknown>> {
    const entry = this.handlers[sql];
    if (!entry) {
      throw new Error(`Unexpected SQL: ${sql}`);
    }

    return new FakePreparedStatement(sql, entry, this.runs);
  }
}

class FakeArtifactStorage implements ArtifactStorage {
  readonly puts: Array<{ key: string; mediaType: string; content: ArrayBuffer }> = [];

  constructor(private readonly objects: Record<string, StoredArtifact> = {}) {}

  async putArtifact(key: string, mediaType: string, content: ArrayBuffer): Promise<void> {
    this.puts.push({ key, mediaType, content });
    this.objects[key] = { key, mediaType, content };
  }

  async getArtifact(key: string): Promise<StoredArtifact | null> {
    return this.objects[key] ?? null;
  }
}

class FakeGithubClient implements GithubClient {
  constructor(
    private readonly repository = {
      externalId: "123456",
      url: "https://github.com/raul/code-reviewer",
      owner: "raul",
      name: "code-reviewer",
      defaultBranch: "main"
    },
    private readonly manifest = {
      resolvedRef: "main",
      manifest: {
        metadata: {
          namespace: "raul",
          name: "code-reviewer",
          version: "0.4.0",
          title: "Code Reviewer",
          description: "Reviews pull requests for correctness and maintainability."
        }
      }
    },
    private readonly files = {
      readme: "# Code Reviewer\n",
      artifacts: [
        {
          path: "README.md",
          mediaType: "text/markdown",
          content: Buffer.from("# Code Reviewer\n").toString("base64")
        },
        {
          path: "agent.yaml",
          mediaType: "application/yaml",
          content: Buffer.from("apiVersion: agentlib.dev/v1alpha1\nkind: Agent\n").toString("base64")
        }
      ]
    }
  ) {}

  async getRepository() {
    return this.repository;
  }

  async getManifest() {
    return this.manifest;
  }

  async getPackageFiles() {
    return this.files;
  }
}

test("D1AgentRepository maps list query rows into API list records", async () => {
  const repository = new D1AgentRepository(
    new FakeDatabase({
      "SELECT namespace, name, latest_version AS latestVersion, latest_title AS title, latest_description AS description FROM agent_list_view ORDER BY namespace, name LIMIT 50": {
        results: [
          {
            namespace: "raul",
            name: "code-reviewer",
            latestVersion: "0.1.0",
            title: "Code Reviewer",
            description: "Reviews pull requests for correctness and maintainability."
          }
        ]
      },
      "SELECT a.namespace, a.name, a.latest_version AS latestVersion, av.version, av.title, av.description, av.published_at AS publishedAt FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 ORDER BY av.published_at DESC": {
        results: []
      }
    }) as unknown as D1Database,
    new FakeArtifactStorage()
  );

  const result = await repository.listAgents();

  assert.deepEqual(result, {
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
  });
});

test("D1AgentRepository groups detail rows into one agent detail response", async () => {
  const repository = new D1AgentRepository(
    new FakeDatabase({
      "SELECT namespace, name, latest_version AS latestVersion, latest_title AS title, latest_description AS description FROM agent_list_view ORDER BY namespace, name LIMIT 50": {
        results: []
      },
      "SELECT a.namespace, a.name, a.latest_version AS latestVersion, av.version, av.title, av.description, av.published_at AS publishedAt FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 ORDER BY av.published_at DESC": {
        results: [
          {
            namespace: "raul",
            name: "code-reviewer",
            latestVersion: "0.2.0",
            version: "0.2.0",
            title: "Code Reviewer",
            description: "Reviews pull requests for correctness and maintainability.",
            publishedAt: "2026-03-11T10:00:00.000Z"
          },
          {
            namespace: "raul",
            name: "code-reviewer",
            latestVersion: "0.2.0",
            version: "0.1.0",
            title: "Code Reviewer",
            description: "Reviews pull requests for correctness and maintainability.",
            publishedAt: "2026-03-10T10:00:00.000Z"
          }
        ]
      }
    }) as unknown as D1Database,
    new FakeArtifactStorage()
  );

  const result = await repository.getAgentDetail("raul", "code-reviewer");

  assert.deepEqual(result, {
    namespace: "raul",
    name: "code-reviewer",
    latestVersion: "0.2.0",
    versions: [
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

test("D1AgentRepository returns null when no detail rows exist", async () => {
  const repository = new D1AgentRepository(
    new FakeDatabase({
      "SELECT namespace, name, latest_version AS latestVersion, latest_title AS title, latest_description AS description FROM agent_list_view ORDER BY namespace, name LIMIT 50": {
        results: []
      },
      "SELECT a.namespace, a.name, a.latest_version AS latestVersion, av.version, av.title, av.description, av.published_at AS publishedAt FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 ORDER BY av.published_at DESC": {
        results: []
      }
    }) as unknown as D1Database,
    new FakeArtifactStorage()
  );

  const result = await repository.getAgentDetail("raul", "missing-agent");

  assert.equal(result, null);
});

test("D1AgentRepository returns one version detail row", async () => {
  const repository = new D1AgentRepository(
    new FakeDatabase({
      "SELECT namespace, name, latest_version AS latestVersion, latest_title AS title, latest_description AS description FROM agent_list_view ORDER BY namespace, name LIMIT 50": {
        results: []
      },
      "SELECT a.namespace, a.name, a.latest_version AS latestVersion, av.version, av.title, av.description, av.published_at AS publishedAt FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 ORDER BY av.published_at DESC": {
        results: []
      },
      "SELECT a.namespace, a.name, av.version, av.title, av.description, av.license, av.manifest_json AS manifestJson, av.published_at AS publishedAt FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 LIMIT 1": {
        results: [
          {
            namespace: "raul",
            name: "code-reviewer",
            version: "0.2.0",
            title: "Code Reviewer",
            description: "Reviews pull requests for correctness and maintainability.",
            license: "MIT",
            manifestJson: "{\"metadata\":{\"namespace\":\"raul\",\"name\":\"code-reviewer\",\"version\":\"0.2.0\"}}",
            publishedAt: "2026-03-11T10:00:00.000Z"
          }
        ]
      }
    }) as unknown as D1Database,
    new FakeArtifactStorage()
  );

  const result = await repository.getAgentVersionDetail("raul", "code-reviewer", "0.2.0");

  assert.deepEqual(result, {
    namespace: "raul",
    name: "code-reviewer",
    version: "0.2.0",
    title: "Code Reviewer",
    description: "Reviews pull requests for correctness and maintainability.",
    license: "MIT",
    manifestJson: "{\"metadata\":{\"namespace\":\"raul\",\"name\":\"code-reviewer\",\"version\":\"0.2.0\"}}",
    publishedAt: "2026-03-11T10:00:00.000Z"
  });
});

test("D1AgentRepository publishes a new version for a new agent", async () => {
  const database = new FakeDatabase({
      "SELECT namespace, name, latest_version AS latestVersion, latest_title AS title, latest_description AS description FROM agent_list_view ORDER BY namespace, name LIMIT 50": {
        results: []
      },
      "SELECT a.namespace, a.name, a.latest_version AS latestVersion, av.version, av.title, av.description, av.published_at AS publishedAt FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 ORDER BY av.published_at DESC": {
        results: []
      },
      "SELECT a.namespace, a.name, av.version, av.title, av.description, av.license, av.manifest_json AS manifestJson, av.published_at AS publishedAt FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 LIMIT 1": {
        results: []
      },
      "SELECT av.id FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 LIMIT 1": {
        results: []
      },
      "SELECT id, namespace, name FROM agents WHERE namespace = ?1 AND name = ?2 LIMIT 1": {
        results: []
      },
      "INSERT INTO agents (id, namespace, name, latest_version, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)": {
        results: []
      },
      "UPDATE agents SET latest_version = ?1, updated_at = ?2 WHERE id = ?3": {
        results: []
      },
      "INSERT INTO agent_versions (id, agent_id, version, title, description, license, manifest_json, readme_path, published_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)": {
        results: []
      },
      "INSERT INTO artifacts (id, agent_version_id, path, media_type, size_bytes, sha256, r2_key) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)": {
        results: []
      }
    });
  const storage = new FakeArtifactStorage();
  const repository = new D1AgentRepository(database as unknown as D1Database, storage);

  const result = await repository.publishAgentVersion({
    manifest: {
      metadata: {
        namespace: "raul",
        name: "code-reviewer",
        version: "0.3.0",
        title: "Code Reviewer",
        description: "Reviews pull requests for correctness and maintainability.",
        license: "MIT"
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
  });

  assert.deepEqual(result, {
    namespace: "raul",
    name: "code-reviewer",
    version: "0.3.0"
  });
  assert.ok(
    database.runs.some(
      (entry) =>
        entry.sql ===
        "INSERT INTO artifacts (id, agent_version_id, path, media_type, size_bytes, sha256, r2_key) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
    )
  );
  assert.equal(storage.puts.length, 1);
  assert.equal(storage.puts[0]?.key, "agents/raul/code-reviewer/0.3.0/agent.yaml");
  const artifactInsert = database.runs.find(
    (entry) =>
      entry.sql ===
      "INSERT INTO artifacts (id, agent_version_id, path, media_type, size_bytes, sha256, r2_key) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
  );
  assert.equal(
    artifactInsert?.args[5],
    "ed7002b439e9ac845f22357d822bac1444730fbdb6016d3ec9432297b9ec9f73"
  );
});

test("D1AgentRepository rejects publishing an existing version", async () => {
  const repository = new D1AgentRepository(
    new FakeDatabase({
      "SELECT namespace, name, latest_version AS latestVersion, latest_title AS title, latest_description AS description FROM agent_list_view ORDER BY namespace, name LIMIT 50": {
        results: []
      },
      "SELECT a.namespace, a.name, a.latest_version AS latestVersion, av.version, av.title, av.description, av.published_at AS publishedAt FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 ORDER BY av.published_at DESC": {
        results: []
      },
      "SELECT a.namespace, a.name, av.version, av.title, av.description, av.license, av.manifest_json AS manifestJson, av.published_at AS publishedAt FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 LIMIT 1": {
        results: []
      },
      "SELECT av.id FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 LIMIT 1": {
        results: [{ id: "existing" }]
      },
      "SELECT id, namespace, name FROM agents WHERE namespace = ?1 AND name = ?2 LIMIT 1": {
        results: []
      },
      "INSERT INTO agents (id, namespace, name, latest_version, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)": {
        results: []
      },
      "UPDATE agents SET latest_version = ?1, updated_at = ?2 WHERE id = ?3": {
        results: []
      },
      "INSERT INTO agent_versions (id, agent_id, version, title, description, license, manifest_json, readme_path, published_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)": {
        results: []
      },
      "INSERT INTO artifacts (id, agent_version_id, path, media_type, size_bytes, sha256, r2_key) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)": {
        results: []
      }
    }) as unknown as D1Database,
    new FakeArtifactStorage()
  );

  await assert.rejects(
    repository.publishAgentVersion({
      manifest: {
        metadata: {
          namespace: "raul",
          name: "code-reviewer",
          version: "0.3.0",
          title: "Code Reviewer",
          description: "Reviews pull requests for correctness and maintainability."
        }
      },
      readme: "# Code Reviewer\n",
      artifacts: []
    }),
    /version_exists/
  );
});

test("D1AgentRepository lists artifact metadata for a version", async () => {
  const repository = new D1AgentRepository(
    new FakeDatabase({
      "SELECT namespace, name, latest_version AS latestVersion, latest_title AS title, latest_description AS description FROM agent_list_view ORDER BY namespace, name LIMIT 50": {
        results: []
      },
      "SELECT a.namespace, a.name, a.latest_version AS latestVersion, av.version, av.title, av.description, av.published_at AS publishedAt FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 ORDER BY av.published_at DESC": {
        results: []
      },
      "SELECT a.namespace, a.name, av.version, av.title, av.description, av.license, av.manifest_json AS manifestJson, av.published_at AS publishedAt FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 LIMIT 1": {
        results: []
      },
      "SELECT art.path, art.media_type AS mediaType, art.size_bytes AS sizeBytes FROM agents a JOIN agent_versions av ON av.agent_id = a.id JOIN artifacts art ON art.agent_version_id = av.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 ORDER BY art.path": {
        results: [
          {
            path: "README.md",
            mediaType: "text/markdown",
            sizeBytes: 287
          },
          {
            path: "agent.yaml",
            mediaType: "application/yaml",
            sizeBytes: 744
          }
        ]
      },
      "SELECT art.path, art.media_type AS mediaType, art.r2_key AS r2Key FROM agents a JOIN agent_versions av ON av.agent_id = a.id JOIN artifacts art ON art.agent_version_id = av.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 AND art.path = ?4 LIMIT 1": {
        results: []
      }
    }) as unknown as D1Database,
    new FakeArtifactStorage()
  );

  const result = await repository.listArtifacts("raul", "docs-writer", "0.1.0");

  assert.deepEqual(result, [
    {
      path: "README.md",
      mediaType: "text/markdown",
      sizeBytes: 287
    },
    {
      path: "agent.yaml",
      mediaType: "application/yaml",
      sizeBytes: 744
    }
  ]);
});

test("D1AgentRepository resolves artifact content from R2 using the stored r2 key", async () => {
  const storage = new FakeArtifactStorage({
    "agents/raul/docs-writer/0.1.0/README.md": {
      key: "agents/raul/docs-writer/0.1.0/README.md",
      mediaType: "text/markdown",
      content: new TextEncoder().encode("# docs-writer\n").buffer
    }
  });
  const repository = new D1AgentRepository(
    new FakeDatabase({
      "SELECT namespace, name, latest_version AS latestVersion, latest_title AS title, latest_description AS description FROM agent_list_view ORDER BY namespace, name LIMIT 50": {
        results: []
      },
      "SELECT a.namespace, a.name, a.latest_version AS latestVersion, av.version, av.title, av.description, av.published_at AS publishedAt FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 ORDER BY av.published_at DESC": {
        results: []
      },
      "SELECT a.namespace, a.name, av.version, av.title, av.description, av.license, av.manifest_json AS manifestJson, av.published_at AS publishedAt FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 LIMIT 1": {
        results: []
      },
      "SELECT art.path, art.media_type AS mediaType, art.size_bytes AS sizeBytes FROM agents a JOIN agent_versions av ON av.agent_id = a.id JOIN artifacts art ON art.agent_version_id = av.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 ORDER BY art.path": {
        results: []
      },
      "SELECT art.path, art.media_type AS mediaType, art.r2_key AS r2Key FROM agents a JOIN agent_versions av ON av.agent_id = a.id JOIN artifacts art ON art.agent_version_id = av.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 AND art.path = ?4 LIMIT 1": {
        results: [
          {
            path: "README.md",
            mediaType: "text/markdown",
            r2Key: "agents/raul/docs-writer/0.1.0/README.md"
          }
        ]
      }
    }) as unknown as D1Database,
    storage
  );

  const result = await repository.getArtifactContent("raul", "docs-writer", "0.1.0", "README.md");

  assert.equal(result?.path, "README.md");
  assert.equal(result?.mediaType, "text/markdown");
  assert.equal(new TextDecoder().decode(result?.content), "# docs-writer\n");
});

test("D1AgentRepository imports a GitHub repository preview and upserts source metadata", async () => {
  const database = new FakeDatabase({
    "SELECT namespace, name, latest_version AS latestVersion, latest_title AS title, latest_description AS description FROM agent_list_view ORDER BY namespace, name LIMIT 50": {
      results: []
    },
    "SELECT a.namespace, a.name, a.latest_version AS latestVersion, av.version, av.title, av.description, av.published_at AS publishedAt FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 ORDER BY av.published_at DESC": {
      results: []
    },
    "SELECT a.namespace, a.name, av.version, av.title, av.description, av.license, av.manifest_json AS manifestJson, av.published_at AS publishedAt FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 LIMIT 1": {
      results: []
    },
    "SELECT art.path, art.media_type AS mediaType, art.size_bytes AS sizeBytes FROM agents a JOIN agent_versions av ON av.agent_id = a.id JOIN artifacts art ON art.agent_version_id = av.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 ORDER BY art.path": {
      results: []
    },
    "SELECT art.path, art.media_type AS mediaType, art.r2_key AS r2Key FROM agents a JOIN agent_versions av ON av.agent_id = a.id JOIN artifacts art ON art.agent_version_id = av.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 AND art.path = ?4 LIMIT 1": {
      results: []
    },
    "SELECT id FROM providers WHERE slug = ?1 LIMIT 1": {
      results: [{ id: "provider_github" }]
    },
    "SELECT id FROM source_repositories WHERE provider_id = ?1 AND external_id = ?2 LIMIT 1": {
      results: []
    },
    "INSERT INTO source_repositories (id, provider_id, external_id, url, owner, repo_name) VALUES (?1, ?2, ?3, ?4, ?5, ?6)": {
      results: []
    },
    "INSERT INTO import_drafts (id, source_repository_id, provider, status, resolved_ref, manifest_json, readme, artifacts_json, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)": {
      results: []
    },
    "UPDATE source_repositories SET url = ?1, owner = ?2, repo_name = ?3 WHERE id = ?4": {
      results: []
    }
  });
  const repository = new D1AgentRepository(
    database as unknown as D1Database,
    new FakeArtifactStorage(),
    new FakeGithubClient()
  );

  const result = await repository.importGithubRepository({
    repositoryUrl: "https://github.com/raul/code-reviewer"
  });

  assert.deepEqual(result, {
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
  });

  assert.ok(
    database.runs.some(
      (entry) =>
        entry.sql ===
        "INSERT INTO source_repositories (id, provider_id, external_id, url, owner, repo_name) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
    )
  );
  assert.ok(
    database.runs.some(
      (entry) =>
        entry.sql ===
        "INSERT INTO import_drafts (id, source_repository_id, provider, status, resolved_ref, manifest_json, readme, artifacts_json, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)"
    )
  );
});

test("D1AgentRepository returns one import draft detail", async () => {
  const repository = new D1AgentRepository(
    new FakeDatabase({
      "SELECT namespace, name, latest_version AS latestVersion, latest_title AS title, latest_description AS description FROM agent_list_view ORDER BY namespace, name LIMIT 50": {
        results: []
      },
      "SELECT a.namespace, a.name, a.latest_version AS latestVersion, av.version, av.title, av.description, av.published_at AS publishedAt FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 ORDER BY av.published_at DESC": {
        results: []
      },
      "SELECT a.namespace, a.name, av.version, av.title, av.description, av.license, av.manifest_json AS manifestJson, av.published_at AS publishedAt FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 LIMIT 1": {
        results: []
      },
      "SELECT art.path, art.media_type AS mediaType, art.size_bytes AS sizeBytes FROM agents a JOIN agent_versions av ON av.agent_id = a.id JOIN artifacts art ON art.agent_version_id = av.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 ORDER BY art.path": {
        results: []
      },
      "SELECT art.path, art.media_type AS mediaType, art.r2_key AS r2Key FROM agents a JOIN agent_versions av ON av.agent_id = a.id JOIN artifacts art ON art.agent_version_id = av.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 AND art.path = ?4 LIMIT 1": {
        results: []
      },
      "SELECT d.id, d.status, d.provider, d.resolved_ref AS resolvedRef, d.manifest_json AS manifestJson, d.readme, d.artifacts_json AS artifactsJson, d.source_repository_id AS sourceRepositoryId, sr.external_id AS externalId, sr.url, sr.owner, sr.repo_name AS repoName FROM import_drafts d JOIN source_repositories sr ON sr.id = d.source_repository_id WHERE d.id = ?1 LIMIT 1": {
        results: [
          {
            id: "import_draft_github_123456_main",
            status: "draft",
            provider: "github",
            resolvedRef: "main",
            manifestJson:
              "{\"metadata\":{\"namespace\":\"raul\",\"name\":\"code-reviewer\",\"version\":\"0.4.0\",\"title\":\"Code Reviewer\",\"description\":\"Reviews pull requests for correctness and maintainability.\"}}",
            readme: "# Code Reviewer\n",
            artifactsJson:
              "[{\"path\":\"README.md\",\"mediaType\":\"text/markdown\",\"content\":\"IyBDb2RlIFJldmlld2VyCg==\"},{\"path\":\"agent.yaml\",\"mediaType\":\"application/yaml\",\"content\":\"YXBpVmVyc2lvbjogYWdlbnRsaWIuZGV2L3YxYWxwaGExCmtpbmQ6IEFnZW50Cg==\"}]",
            sourceRepositoryId: "source_repo_github_123456",
            externalId: "123456",
            url: "https://github.com/raul/code-reviewer",
            owner: "raul",
            repoName: "code-reviewer"
          }
        ]
      }
    }) as unknown as D1Database,
    new FakeArtifactStorage()
  );

  const result = await repository.getImportDraft("import_draft_github_123456_main");

  assert.deepEqual(result, {
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
  });
});

test("D1AgentRepository publishes a draft and updates its status", async () => {
  const database = new FakeDatabase({
    "SELECT namespace, name, latest_version AS latestVersion, latest_title AS title, latest_description AS description FROM agent_list_view ORDER BY namespace, name LIMIT 50": {
      results: []
    },
    "SELECT a.namespace, a.name, a.latest_version AS latestVersion, av.version, av.title, av.description, av.published_at AS publishedAt FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 ORDER BY av.published_at DESC": {
      results: []
    },
    "SELECT a.namespace, a.name, av.version, av.title, av.description, av.license, av.manifest_json AS manifestJson, av.published_at AS publishedAt FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 LIMIT 1": {
      results: []
    },
    "SELECT art.path, art.media_type AS mediaType, art.size_bytes AS sizeBytes FROM agents a JOIN agent_versions av ON av.agent_id = a.id JOIN artifacts art ON art.agent_version_id = av.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 ORDER BY art.path": {
      results: []
    },
    "SELECT art.path, art.media_type AS mediaType, art.r2_key AS r2Key FROM agents a JOIN agent_versions av ON av.agent_id = a.id JOIN artifacts art ON art.agent_version_id = av.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 AND art.path = ?4 LIMIT 1": {
      results: []
    },
    "SELECT d.id, d.status, d.provider, d.resolved_ref AS resolvedRef, d.manifest_json AS manifestJson, d.readme, d.artifacts_json AS artifactsJson, d.source_repository_id AS sourceRepositoryId, sr.external_id AS externalId, sr.url, sr.owner, sr.repo_name AS repoName FROM import_drafts d JOIN source_repositories sr ON sr.id = d.source_repository_id WHERE d.id = ?1 LIMIT 1": {
      results: [
        {
          id: "import_draft_github_123456_main",
          status: "draft",
          provider: "github",
          resolvedRef: "main",
          manifestJson:
            "{\"metadata\":{\"namespace\":\"raul\",\"name\":\"code-reviewer\",\"version\":\"0.4.0\",\"title\":\"Code Reviewer\",\"description\":\"Reviews pull requests for correctness and maintainability.\"}}",
          readme: "# Code Reviewer\n",
          artifactsJson:
            "[{\"path\":\"README.md\",\"mediaType\":\"text/markdown\",\"content\":\"IyBDb2RlIFJldmlld2VyCg==\"},{\"path\":\"agent.yaml\",\"mediaType\":\"application/yaml\",\"content\":\"YXBpVmVyc2lvbjogYWdlbnRsaWIuZGV2L3YxYWxwaGExCmtpbmQ6IEFnZW50Cg==\"}]",
          sourceRepositoryId: "source_repo_github_123456",
          externalId: "123456",
          url: "https://github.com/raul/code-reviewer",
          owner: "raul",
          repoName: "code-reviewer"
        }
      ]
    },
    "SELECT av.id FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 LIMIT 1": {
      results: []
    },
    "SELECT id, namespace, name FROM agents WHERE namespace = ?1 AND name = ?2 LIMIT 1": {
      results: []
    },
    "INSERT INTO agents (id, namespace, name, latest_version, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)": {
      results: []
    },
    "UPDATE agents SET latest_version = ?1, updated_at = ?2 WHERE id = ?3": {
      results: []
    },
    "INSERT INTO agent_versions (id, agent_id, version, title, description, license, manifest_json, readme_path, published_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)": {
      results: []
    },
    "INSERT INTO artifacts (id, agent_version_id, path, media_type, size_bytes, sha256, r2_key) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)": {
      results: []
    },
    "UPDATE import_drafts SET status = ?1, updated_at = ?2 WHERE id = ?3": {
      results: []
    }
  });
  const storage = new FakeArtifactStorage();
  const repository = new D1AgentRepository(database as unknown as D1Database, storage);

  const result = await repository.publishImportDraft("import_draft_github_123456_main");

  assert.deepEqual(result, {
    namespace: "raul",
    name: "code-reviewer",
    version: "0.4.0"
  });
  assert.ok(
    database.runs.some(
      (entry) =>
        entry.sql ===
        "INSERT INTO artifacts (id, agent_version_id, path, media_type, size_bytes, sha256, r2_key) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
    )
  );
  assert.equal(storage.puts.length, 2);
  assert.ok(
    database.runs.some(
      (entry) =>
        entry.sql ===
        "UPDATE import_drafts SET status = ?1, updated_at = ?2 WHERE id = ?3" &&
        entry.args[0] === "published"
    )
  );
});
