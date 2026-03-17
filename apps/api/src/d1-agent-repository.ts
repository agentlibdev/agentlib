import type {
  AgentDetail,
  AgentListItem,
  AgentVersionDetail,
  AgentVersionRecord,
  ArtifactContent,
  ArtifactRecord,
  PublishRequest,
  PublishResult
} from "../../../packages/core/src/agent-record.js";
import type { AgentRepository } from "../../../packages/core/src/agent-repository.js";
import type { ArtifactStorage } from "../../../packages/storage/src/artifact-storage.js";

const LIST_AGENTS_SQL =
  "SELECT namespace, name, latest_version AS latestVersion, latest_title AS title, latest_description AS description FROM agent_list_view ORDER BY namespace, name LIMIT 50";

const GET_AGENT_DETAIL_SQL =
  "SELECT a.namespace, a.name, a.latest_version AS latestVersion, av.version, av.title, av.description, av.published_at AS publishedAt FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 ORDER BY av.published_at DESC";

const GET_AGENT_VERSION_DETAIL_SQL =
  "SELECT a.namespace, a.name, av.version, av.title, av.description, av.license, av.manifest_json AS manifestJson, av.published_at AS publishedAt FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 LIMIT 1";

const CHECK_AGENT_SQL =
  "SELECT id, namespace, name FROM agents WHERE namespace = ?1 AND name = ?2 LIMIT 1";

const CHECK_AGENT_VERSION_SQL =
  "SELECT av.id FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 LIMIT 1";

const INSERT_AGENT_SQL =
  "INSERT INTO agents (id, namespace, name, latest_version, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)";

const UPDATE_AGENT_LATEST_SQL =
  "UPDATE agents SET latest_version = ?1, updated_at = ?2 WHERE id = ?3";

const INSERT_AGENT_VERSION_SQL =
  "INSERT INTO agent_versions (id, agent_id, version, title, description, license, manifest_json, readme_path, published_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)";

const INSERT_ARTIFACT_SQL =
  "INSERT INTO artifacts (id, agent_version_id, path, media_type, size_bytes, sha256, r2_key) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)";

const LIST_ARTIFACTS_SQL =
  "SELECT art.path, art.media_type AS mediaType, art.size_bytes AS sizeBytes FROM agents a JOIN agent_versions av ON av.agent_id = a.id JOIN artifacts art ON art.agent_version_id = av.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 ORDER BY art.path";

const GET_ARTIFACT_SQL =
  "SELECT art.path, art.media_type AS mediaType, art.r2_key AS r2Key FROM agents a JOIN agent_versions av ON av.agent_id = a.id JOIN artifacts art ON art.agent_version_id = av.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 AND art.path = ?4 LIMIT 1";

type AgentListRow = AgentListItem;

type AgentDetailRow = {
  namespace: string;
  name: string;
  latestVersion: string;
  version: string;
  title: string;
  description: string;
  publishedAt: string;
};

type AgentVersionDetailRow = {
  namespace: string;
  name: string;
  version: string;
  title: string;
  description: string;
  license: string | null;
  manifestJson: string;
  publishedAt: string;
};

type AgentRow = {
  id: string;
  namespace: string;
  name: string;
};

type ArtifactRow = ArtifactRecord;

type ArtifactLookupRow = {
  path: string;
  mediaType: string;
  r2Key: string;
};

function createId(prefix: string, parts: string[]): string {
  return [prefix, ...parts].join("_").replace(/[^a-zA-Z0-9_]/g, "_");
}

function getBase64ByteLength(content: string): number {
  const normalized = content.replace(/\s+/g, "");
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return (normalized.length * 3) / 4 - padding;
}

function createArtifactMetadata(content: string) {
  const sizeBytes = getBase64ByteLength(content);

  return {
    sizeBytes,
    sha256: "pending",
    r2Key: "pending"
  };
}

function buildArtifactKey(namespace: string, name: string, version: string, path: string): string {
  return `agents/${namespace}/${name}/${version}/${path}`;
}

function decodeBase64Bytes(content: string): ArrayBuffer {
  return Uint8Array.from(atob(content), (char) => char.charCodeAt(0)).buffer;
}

export class D1AgentRepository implements AgentRepository {
  constructor(
    private readonly db: D1Database,
    private readonly storage: ArtifactStorage
  ) {}

  async listAgents() {
    const result = await this.db.prepare(LIST_AGENTS_SQL).all<AgentListRow>();

    return {
      items: result.results,
      nextCursor: null
    };
  }

  async getAgentDetail(namespace: string, name: string): Promise<AgentDetail | null> {
    const result = await this.db
      .prepare(GET_AGENT_DETAIL_SQL)
      .bind(namespace, name)
      .all<AgentDetailRow>();

    if (result.results.length === 0) {
      return null;
    }

    const [firstRow] = result.results;
    const versions: AgentVersionRecord[] = result.results.map((row) => ({
      version: row.version,
      title: row.title,
      description: row.description,
      publishedAt: row.publishedAt
    }));

    return {
      namespace: firstRow.namespace,
      name: firstRow.name,
      latestVersion: firstRow.latestVersion,
      versions
    };
  }

  async listAgentVersions(namespace: string, name: string): Promise<AgentVersionRecord[] | null> {
    const detail = await this.getAgentDetail(namespace, name);
    return detail ? detail.versions : null;
  }

  async getAgentVersionDetail(
    namespace: string,
    name: string,
    version: string
  ): Promise<AgentVersionDetail | null> {
    const result = await this.db
      .prepare(GET_AGENT_VERSION_DETAIL_SQL)
      .bind(namespace, name, version)
      .all<AgentVersionDetailRow>();

    const row = result.results[0];
    if (!row) {
      return null;
    }

    return {
      namespace: row.namespace,
      name: row.name,
      version: row.version,
      title: row.title,
      description: row.description,
      license: row.license,
      manifestJson: row.manifestJson,
      publishedAt: row.publishedAt
    };
  }

  async listArtifacts(
    namespace: string,
    name: string,
    version: string
  ): Promise<ArtifactRecord[] | null> {
    const result = await this.db
      .prepare(LIST_ARTIFACTS_SQL)
      .bind(namespace, name, version)
      .all<ArtifactRow>();

    return result.results.length > 0 ? result.results : null;
  }

  async getArtifactContent(
    namespace: string,
    name: string,
    version: string,
    path: string
  ): Promise<ArtifactContent | null> {
    const result = await this.db
      .prepare(GET_ARTIFACT_SQL)
      .bind(namespace, name, version, path)
      .all<ArtifactLookupRow>();

    const row = result.results[0];
    if (!row) {
      return null;
    }

    const artifact = await this.storage.getArtifact(row.r2Key);
    if (!artifact) {
      return null;
    }

    return {
      path: row.path,
      mediaType: row.mediaType,
      content: artifact.content
    };
  }

  async publishAgentVersion(payload: PublishRequest): Promise<PublishResult> {
    const metadata = payload.manifest.metadata;
    const now = new Date().toISOString();

    const existingVersion = await this.db
      .prepare(CHECK_AGENT_VERSION_SQL)
      .bind(metadata.namespace, metadata.name, metadata.version)
      .all<{ id: string }>();

    if (existingVersion.results.length > 0) {
      throw new Error("version_exists");
    }

    const existingAgent = await this.db
      .prepare(CHECK_AGENT_SQL)
      .bind(metadata.namespace, metadata.name)
      .all<AgentRow>();

    const agentId =
      existingAgent.results[0]?.id ??
      createId("agent", [metadata.namespace, metadata.name]);

    if (existingAgent.results.length === 0) {
      await this.db
        .prepare(INSERT_AGENT_SQL)
        .bind(agentId, metadata.namespace, metadata.name, metadata.version, now, now)
        .run();
    } else {
      await this.db.prepare(UPDATE_AGENT_LATEST_SQL).bind(metadata.version, now, agentId).run();
    }

    const versionId = createId("agent_version", [
      metadata.namespace,
      metadata.name,
      metadata.version
    ]);

    await this.db
      .prepare(INSERT_AGENT_VERSION_SQL)
      .bind(
        versionId,
        agentId,
        metadata.version,
        metadata.title,
        metadata.description,
        metadata.license ?? null,
        JSON.stringify(payload.manifest),
        "README.md",
        now
      )
      .run();

    for (const artifact of payload.artifacts) {
      const artifactId = createId("artifact", [
        metadata.namespace,
        metadata.name,
        metadata.version,
        artifact.path
      ]);
      const artifactMeta = createArtifactMetadata(artifact.content);
      const artifactKey = buildArtifactKey(
        metadata.namespace,
        metadata.name,
        metadata.version,
        artifact.path
      );

      await this.storage.putArtifact(
        artifactKey,
        artifact.mediaType,
        decodeBase64Bytes(artifact.content)
      );

      await this.db
        .prepare(INSERT_ARTIFACT_SQL)
        .bind(
          artifactId,
          versionId,
          artifact.path,
          artifact.mediaType,
          artifactMeta.sizeBytes,
          artifactMeta.sha256,
          artifactKey
        )
        .run();
    }

    return {
      namespace: metadata.namespace,
      name: metadata.name,
      version: metadata.version
    };
  }
}

export const d1Queries = {
  LIST_AGENTS_SQL,
  GET_AGENT_DETAIL_SQL,
  GET_AGENT_VERSION_DETAIL_SQL,
  INSERT_ARTIFACT_SQL,
  LIST_ARTIFACTS_SQL,
  GET_ARTIFACT_SQL
};
