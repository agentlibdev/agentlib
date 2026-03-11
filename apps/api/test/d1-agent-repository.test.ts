import assert from "node:assert/strict";
import test from "node:test";

import { D1AgentRepository } from "../src/d1-agent-repository.js";

type StatementResult<Row> = {
  results: Row[];
};

class FakePreparedStatement<Row> {
  constructor(private readonly result: StatementResult<Row>) {}

  bind(): FakePreparedStatement<Row> {
    return this;
  }

  async all(): Promise<StatementResult<Row>> {
    return this.result;
  }

  async run(): Promise<{ success: true }> {
    return { success: true };
  }
}

class FakeDatabase {
  constructor(
    private readonly handlers: Record<string, StatementResult<Record<string, unknown>>>
  ) {}

  prepare(sql: string): FakePreparedStatement<Record<string, unknown>> {
    const entry = this.handlers[sql];
    if (!entry) {
      throw new Error(`Unexpected SQL: ${sql}`);
    }

    return new FakePreparedStatement(entry);
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
    }) as unknown as D1Database
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
    }) as unknown as D1Database
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
    }) as unknown as D1Database
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
    }) as unknown as D1Database
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
      }
    }) as unknown as D1Database
  );

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
    artifacts: []
  });

  assert.deepEqual(result, {
    namespace: "raul",
    name: "code-reviewer",
    version: "0.3.0"
  });
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
      }
    }) as unknown as D1Database
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
