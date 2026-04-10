import assert from "node:assert/strict";
import test from "node:test";

import { D1AgentRepository } from "../src/d1-agent-repository.js";
import type { ArtifactStorage, StoredArtifact } from "@storage/artifact-storage.js";
import type { GithubClient } from "@providers/github-client.js";

const authenticatedUser = {
  provider: "github" as const,
  subject: "123456",
  handle: "raul",
  displayName: "Raul"
};

const googleUser = {
  provider: "google" as const,
  subject: "google-123456",
  handle: "raul",
  displayName: "Raul Google",
  email: "raul@example.com"
};

type StatementResult<Row> = {
  results: Row[];
};

function normalizeLegacySql(sql: string): string {
  return sql
    .replace(", av.compatibility_json AS compatibilityJson", "")
    .replace(
      ", a.namespace_type AS namespaceType, a.verification_status AS verificationStatus, a.canonical_namespace AS canonicalNamespace, a.canonical_name AS canonicalName, a.claimed_by_namespace AS claimedByNamespace, a.source_type AS sourceType, a.source_url AS sourceUrl, a.source_repository_url AS sourceRepositoryUrl, a.original_author_handle AS originalAuthorHandle, a.original_author_name AS originalAuthorName, a.original_author_url AS originalAuthorUrl, a.submitted_by_handle AS submittedByHandle, a.submitted_by_name AS submittedByName",
      ""
    )
    .replace(
      ", lifecycle_status AS lifecycleStatus, owner_handle AS ownerHandle",
      ""
    )
    .replace(
      ", a.lifecycle_status AS lifecycleStatus, u.handle AS ownerHandle",
      ""
    )
    .replace(
      "a.lifecycle_status AS lifecycleStatus, u.handle AS ownerHandle, ",
      ""
    )
    .replace(" JOIN users u ON u.id = a.owner_user_id", "")
    .replace(", u.display_name AS ownerDisplayName", "")
    .replace(", owner_user_id AS ownerUserId", "")
    .replace(", readme_path, compatibility_json, published_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)", ", readme_path, published_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)")
    .replace(", ?9, ?10)", ", ?9)");
}

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
    return {
      results: this.result.results.map((row) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) {
          return row;
        }

        const maybeRow = { ...row } as Record<string, unknown>;

        if (
          this.sql.includes("agent_list_view") ||
          this.sql.includes("JOIN users u ON u.id = a.owner_user_id")
        ) {
          maybeRow.lifecycleStatus ??= "active";
          maybeRow.ownerHandle ??= "raul";
        }

        if (this.sql.includes("JOIN users u ON u.id = a.owner_user_id")) {
          maybeRow.ownerDisplayName ??= "Raul";
          maybeRow.namespaceType ??= "official";
          maybeRow.verificationStatus ??= "official";
          maybeRow.canonicalNamespace ??= maybeRow.namespace;
          maybeRow.canonicalName ??= maybeRow.name;
          maybeRow.claimedByNamespace ??= null;
          maybeRow.sourceType ??= "manual";
          maybeRow.sourceUrl ??= null;
          maybeRow.sourceRepositoryUrl ??= null;
          maybeRow.originalAuthorHandle ??= maybeRow.ownerHandle;
          maybeRow.originalAuthorName ??= maybeRow.ownerDisplayName;
          maybeRow.originalAuthorUrl ??= null;
          maybeRow.submittedByHandle ??= maybeRow.ownerHandle;
          maybeRow.submittedByName ??= maybeRow.ownerDisplayName;
        }

        if (this.sql.includes("FROM agents WHERE namespace = ?1 AND name = ?2 LIMIT 1")) {
          maybeRow.ownerUserId ??= "user_github_123456";
        }

        return maybeRow as Row;
      })
    };
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
    const entry = this.handlers[sql] ?? this.handlers[normalizeLegacySql(sql)];
    if (!entry) {
      if (
        sql === "SELECT id, namespace, name, owner_user_id AS ownerUserId FROM agents WHERE namespace = ?1 AND name = ?2 LIMIT 1" ||
        sql === "SELECT user_id AS id FROM auth_identities WHERE provider = ?1 AND provider_subject = ?2 LIMIT 1" ||
        sql === "SELECT id FROM users WHERE email = ?1 LIMIT 1" ||
        sql === "SELECT id FROM users WHERE handle = ?1 LIMIT 1" ||
        sql ===
          "INSERT INTO users (id, handle, display_name, email, avatar_url, bio, pronouns, company, location, website_url, time_zone_name, display_local_time, status_emoji, status_text, social_links_json, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '[]', ?6, ?7)" ||
        sql ===
          "INSERT INTO auth_identities (id, user_id, provider, provider_subject, created_at) VALUES (?1, ?2, ?3, ?4, ?5)" ||
        sql ===
          "UPDATE users SET handle = ?1, display_name = ?2, email = ?3, avatar_url = ?4, updated_at = ?5 WHERE id = ?6" ||
        sql ===
          "INSERT INTO agent_versions (id, agent_id, version, title, description, license, manifest_json, readme_path, compatibility_json, published_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)" ||
        sql ===
          "UPDATE agent_versions SET compatibility_json = ?1 WHERE id = ?2" ||
        sql ===
          "SELECT download_count AS downloadCount, pin_count AS pinCount, star_count AS starCount FROM agent_metrics WHERE agent_id = ?1 LIMIT 1" ||
        sql ===
          "INSERT INTO agents (id, namespace, name, owner_user_id, lifecycle_status, latest_version, namespace_type, verification_status, canonical_namespace, canonical_name, claimed_by_namespace, source_type, source_url, source_repository_url, original_author_handle, original_author_name, original_author_url, submitted_by_handle, submitted_by_name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)" ||
        sql ===
          "INSERT INTO agent_metrics (agent_id, download_count, pin_count, star_count, updated_at) VALUES (?1, 0, 0, 0, ?2)" ||
        sql ===
          "UPDATE agents SET lifecycle_status = ?1, updated_at = ?2 WHERE id = ?3"
      ) {
        return new FakePreparedStatement(sql, { results: [] }, this.runs);
      }

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
          path: "agent.md",
          mediaType: "text/markdown",
          content: Buffer.from("You are a careful code reviewer.\n").toString("base64")
        },
        {
          path: "LICENSE",
          mediaType: "text/plain",
          content: Buffer.from("MIT License\n").toString("base64")
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
            description: "Reviews pull requests for correctness and maintainability.",
            lifecycleStatus: "active",
            ownerHandle: "raul"
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
        description: "Reviews pull requests for correctness and maintainability.",
        lifecycleStatus: "active",
        ownerHandle: "raul",
        downloadCount: 0,
        pinCount: 0,
        starCount: 0
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
            lifecycleStatus: "active",
            ownerHandle: "raul",
            version: "0.2.0",
            title: "Code Reviewer",
            description: "Reviews pull requests for correctness and maintainability.",
            publishedAt: "2026-03-11T10:00:00.000Z"
          },
          {
            namespace: "raul",
            name: "code-reviewer",
            latestVersion: "0.2.0",
            lifecycleStatus: "active",
            ownerHandle: "raul",
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
      originalAuthorUrl: null,
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
          targetId: "claude-code",
          builtFor: true,
          tested: true,
          adapterAvailable: true
        },
        {
          targetId: "github-copilot",
          builtFor: true,
          tested: false,
          adapterAvailable: true
        },
        {
          targetId: "openclaw",
          builtFor: false,
          tested: false,
          adapterAvailable: true
        },
        {
          targetId: "crewai",
          builtFor: false,
          tested: false,
          adapterAvailable: true
        },
        {
          targetId: "langchain",
          builtFor: false,
          tested: false,
          adapterAvailable: true
        }
      ]
    },
    downloadCount: 0,
    pinCount: 0,
    starCount: 0,
    viewer: {
      hasPinned: false,
      hasStarred: false
    },
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
            publishedAt: "2026-03-11T10:00:00.000Z",
            lifecycleStatus: "active",
            ownerHandle: "raul"
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
      originalAuthorUrl: null,
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
          targetId: "claude-code",
          builtFor: true,
          tested: true,
          adapterAvailable: true
        },
        {
          targetId: "github-copilot",
          builtFor: true,
          tested: false,
          adapterAvailable: true
        },
        {
          targetId: "openclaw",
          builtFor: false,
          tested: false,
          adapterAvailable: true
        },
        {
          targetId: "crewai",
          builtFor: false,
          tested: false,
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
  });
});

test("D1AgentRepository publishes a new version for a new agent", async () => {
  const database = new FakeDatabase({
      "SELECT namespace, name, latest_version AS latestVersion, latest_title AS title, latest_description AS description, lifecycle_status AS lifecycleStatus, owner_handle AS ownerHandle FROM agent_list_view ORDER BY namespace, name LIMIT 50": {
        results: []
      },
      "SELECT a.namespace, a.name, a.latest_version AS latestVersion, a.lifecycle_status AS lifecycleStatus, u.handle AS ownerHandle, av.version, av.title, av.description, av.published_at AS publishedAt FROM agents a JOIN users u ON u.id = a.owner_user_id JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 ORDER BY av.published_at DESC": {
        results: []
      },
      "SELECT a.namespace, a.name, av.version, av.title, av.description, av.license, av.manifest_json AS manifestJson, av.published_at AS publishedAt, a.lifecycle_status AS lifecycleStatus, u.handle AS ownerHandle FROM agents a JOIN users u ON u.id = a.owner_user_id JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 LIMIT 1": {
        results: []
      },
      "SELECT av.id FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 LIMIT 1": {
        results: []
      },
      "SELECT id, namespace, name FROM agents WHERE namespace = ?1 AND name = ?2 LIMIT 1": {
        results: []
      },
      "SELECT user_id AS id FROM auth_identities WHERE provider = ?1 AND provider_subject = ?2 LIMIT 1": {
        results: []
      },
      "SELECT id FROM users WHERE email = ?1 LIMIT 1": {
        results: []
      },
      "INSERT INTO users (id, handle, display_name, email, avatar_url, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)": {
        results: []
      },
      "INSERT INTO auth_identities (id, user_id, provider, provider_subject, created_at) VALUES (?1, ?2, ?3, ?4, ?5)": {
        results: []
      },
      "UPDATE users SET handle = ?1, display_name = ?2, email = ?3, avatar_url = ?4, updated_at = ?5 WHERE id = ?6": {
        results: []
      },
      "INSERT INTO agents (id, namespace, name, owner_user_id, lifecycle_status, latest_version, namespace_type, verification_status, canonical_namespace, canonical_name, claimed_by_namespace, source_type, source_url, source_repository_url, original_author_handle, original_author_name, original_author_url, submitted_by_handle, submitted_by_name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)": {
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
  }, authenticatedUser);

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
  assert.ok(
    database.runs.some(
      (entry) =>
        entry.sql ===
          "INSERT INTO agents (id, namespace, name, owner_user_id, lifecycle_status, latest_version, namespace_type, verification_status, canonical_namespace, canonical_name, claimed_by_namespace, source_type, source_url, source_repository_url, original_author_handle, original_author_name, original_author_url, submitted_by_handle, submitted_by_name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)" &&
        entry.args[3] === "user_github_123456" &&
        entry.args[4] === "active" &&
        entry.args[6] === "official" &&
        entry.args[7] === "official"
    )
  );
});

test("D1AgentRepository links a second OAuth identity to the same user by email", async () => {
  const database = new FakeDatabase({
    "SELECT av.id FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 LIMIT 1": {
      results: []
    },
    "SELECT id, namespace, name FROM agents WHERE namespace = ?1 AND name = ?2 LIMIT 1": {
      results: []
    },
    "SELECT user_id AS id FROM auth_identities WHERE provider = ?1 AND provider_subject = ?2 LIMIT 1": {
      results: []
    },
    "SELECT id FROM users WHERE email = ?1 LIMIT 1": {
      results: [{ id: "user_github_123456" }]
    },
    "INSERT INTO auth_identities (id, user_id, provider, provider_subject, created_at) VALUES (?1, ?2, ?3, ?4, ?5)": {
      results: []
    },
    "UPDATE users SET handle = ?1, display_name = ?2, email = ?3, avatar_url = ?4, updated_at = ?5 WHERE id = ?6": {
      results: []
    },
    "INSERT INTO agents (id, namespace, name, owner_user_id, lifecycle_status, latest_version, namespace_type, verification_status, canonical_namespace, canonical_name, claimed_by_namespace, source_type, source_url, source_repository_url, original_author_handle, original_author_name, original_author_url, submitted_by_handle, submitted_by_name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)": {
      results: []
    },
    "INSERT INTO agent_versions (id, agent_id, version, title, description, license, manifest_json, readme_path, published_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)": {
      results: []
    }
  });

  const repository = new D1AgentRepository(
    database as unknown as D1Database,
    new FakeArtifactStorage()
  );

  await repository.publishAgentVersion(
    {
      manifest: {
        metadata: {
          namespace: "raul",
          name: "docs-writer",
          version: "0.1.0",
          title: "Docs Writer",
          description: "Writes docs."
        }
      },
      readme: "# Docs Writer\n",
      artifacts: []
    },
    googleUser
  );

  assert.ok(
    database.runs.some(
      (entry) =>
        entry.sql ===
          "INSERT INTO auth_identities (id, user_id, provider, provider_subject, created_at) VALUES (?1, ?2, ?3, ?4, ?5)" &&
        entry.args[1] === "user_github_123456" &&
        entry.args[2] === "google" &&
        entry.args[3] === "google-123456"
    )
  );
  assert.ok(
    !database.runs.some((entry) => entry.sql.startsWith("INSERT INTO users "))
  );
});

test("D1AgentRepository links an OAuth identity to an existing user with the same handle", async () => {
  const database = new FakeDatabase({
    "SELECT av.id FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 LIMIT 1": {
      results: []
    },
    "SELECT id, namespace, name FROM agents WHERE namespace = ?1 AND name = ?2 LIMIT 1": {
      results: []
    },
    "SELECT user_id AS id FROM auth_identities WHERE provider = ?1 AND provider_subject = ?2 LIMIT 1": {
      results: []
    },
    "SELECT id FROM users WHERE email = ?1 LIMIT 1": {
      results: []
    },
    "SELECT id FROM users WHERE handle = ?1 LIMIT 1": {
      results: [{ id: "user_seed_raul" }]
    },
    "INSERT INTO auth_identities (id, user_id, provider, provider_subject, created_at) VALUES (?1, ?2, ?3, ?4, ?5)": {
      results: []
    },
    "UPDATE users SET handle = ?1, display_name = ?2, email = ?3, avatar_url = ?4, updated_at = ?5 WHERE id = ?6": {
      results: []
    },
    "INSERT INTO agents (id, namespace, name, owner_user_id, lifecycle_status, latest_version, namespace_type, verification_status, canonical_namespace, canonical_name, claimed_by_namespace, source_type, source_url, source_repository_url, original_author_handle, original_author_name, original_author_url, submitted_by_handle, submitted_by_name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)": {
      results: []
    },
    "INSERT INTO agent_versions (id, agent_id, version, title, description, license, manifest_json, readme_path, published_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)": {
      results: []
    }
  });

  const repository = new D1AgentRepository(
    database as unknown as D1Database,
    new FakeArtifactStorage()
  );

  await repository.publishAgentVersion(
    {
      manifest: {
        metadata: {
          namespace: "raul",
          name: "support-triager",
          version: "0.1.0",
          title: "Support Triager",
          description: "Routes inbound support requests."
        }
      },
      readme: "# Support Triager\n",
      artifacts: []
    },
    authenticatedUser
  );

  assert.ok(
    database.runs.some(
      (entry) =>
        entry.sql ===
          "INSERT INTO auth_identities (id, user_id, provider, provider_subject, created_at) VALUES (?1, ?2, ?3, ?4, ?5)" &&
        entry.args[1] === "user_seed_raul"
    )
  );
  assert.ok(
    !database.runs.some((entry) => entry.sql.startsWith("INSERT INTO users "))
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
    }, authenticatedUser),
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
  }, authenticatedUser);

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
              "[{\"path\":\"README.md\",\"mediaType\":\"text/markdown\",\"content\":\"IyBDb2RlIFJldmlld2VyCg==\"},{\"path\":\"agent.md\",\"mediaType\":\"text/markdown\",\"content\":\"WW91IGFyZSBhIGNhcmVmdWwgY29kZSByZXZpZXdlci4K\"},{\"path\":\"LICENSE\",\"mediaType\":\"text/plain\",\"content\":\"TUlUIExpY2Vuc2UK\"},{\"path\":\"agent.yaml\",\"mediaType\":\"application/yaml\",\"content\":\"YXBpVmVyc2lvbjogYWdlbnRsaWIuZGV2L3YxYWxwaGExCmtpbmQ6IEFnZW50Cg==\"}]",
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
            "[{\"path\":\"README.md\",\"mediaType\":\"text/markdown\",\"content\":\"IyBDb2RlIFJldmlld2VyCg==\"},{\"path\":\"agent.md\",\"mediaType\":\"text/markdown\",\"content\":\"WW91IGFyZSBhIGNhcmVmdWwgY29kZSByZXZpZXdlci4K\"},{\"path\":\"LICENSE\",\"mediaType\":\"text/plain\",\"content\":\"TUlUIExpY2Vuc2UK\"},{\"path\":\"agent.yaml\",\"mediaType\":\"application/yaml\",\"content\":\"YXBpVmVyc2lvbjogYWdlbnRsaWIuZGV2L3YxYWxwaGExCmtpbmQ6IEFnZW50Cg==\"}]",
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

  const result = await repository.publishImportDraft("import_draft_github_123456_main", authenticatedUser);

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
  assert.ok(
    database.runs.some(
      (entry) =>
        entry.sql ===
        "UPDATE import_drafts SET status = ?1, updated_at = ?2 WHERE id = ?3" &&
        entry.args[0] === "published"
    )
  );
  assert.equal(storage.puts.length, 4);
});
