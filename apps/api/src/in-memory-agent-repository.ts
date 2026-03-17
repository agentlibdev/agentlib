import type {
  AgentDetail,
  AgentListResult,
  AgentVersionDetail,
  AgentVersionRecord,
  ArtifactContent,
  ArtifactRecord,
  PublishRequest,
  PublishResult
} from "../../../packages/core/src/agent-record.js";
import type { AgentRepository } from "../../../packages/core/src/agent-repository.js";

const seedAgent: AgentDetail = {
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
};

export class InMemoryAgentRepository implements AgentRepository {
  private readonly agents = new Map<string, AgentDetail>([[`${seedAgent.namespace}/${seedAgent.name}`, seedAgent]]);
  private readonly artifacts = new Map<string, ArtifactContent[]>();

  async listAgents(): Promise<AgentListResult> {
    const entries = [...this.agents.values()];
    return {
      items: entries.map((agent) => ({
        namespace: agent.namespace,
        name: agent.name,
        latestVersion: agent.latestVersion,
        title: agent.versions[0].title,
        description: agent.versions[0].description
      })),
      nextCursor: null
    };
  }

  async getAgentDetail(namespace: string, name: string): Promise<AgentDetail | null> {
    return this.agents.get(`${namespace}/${name}`) ?? null;
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
    const detail = await this.getAgentDetail(namespace, name);
    const versionRecord = detail?.versions.find((entry) => entry.version === version);

    if (!detail || !versionRecord) {
      return null;
    }

    return {
      namespace: detail.namespace,
      name: detail.name,
      version: versionRecord.version,
      title: versionRecord.title,
      description: versionRecord.description,
      license: "MIT",
      manifestJson: JSON.stringify({
        metadata: {
          namespace: detail.namespace,
          name: detail.name,
          version: versionRecord.version
        }
      }),
      publishedAt: versionRecord.publishedAt
    };
  }

  async listArtifacts(
    namespace: string,
    name: string,
    version: string
  ): Promise<ArtifactRecord[] | null> {
    const artifacts = this.artifacts.get(`${namespace}/${name}/${version}`);
    if (!artifacts) {
      return null;
    }

      return artifacts.map((artifact) => ({
        path: artifact.path,
        mediaType: artifact.mediaType,
        sizeBytes: artifact.content.byteLength
      }));
  }

  async getArtifactContent(
    namespace: string,
    name: string,
    version: string,
    path: string
  ): Promise<ArtifactContent | null> {
    const artifacts = this.artifacts.get(`${namespace}/${name}/${version}`);
    return artifacts?.find((artifact) => artifact.path === path) ?? null;
  }

  async publishAgentVersion(payload: PublishRequest): Promise<PublishResult> {
    const { namespace, name, version, title, description } = payload.manifest.metadata;
    const key = `${namespace}/${name}`;
    const existing = this.agents.get(key);

    if (existing?.versions.some((entry) => entry.version === version)) {
      throw new Error("version_exists");
    }

    const publishedAt = new Date().toISOString();
    const newVersion: AgentVersionRecord = {
      version,
      title,
      description,
      publishedAt
    };

    const updated: AgentDetail = existing
      ? {
          ...existing,
          latestVersion: version,
          versions: [newVersion, ...existing.versions]
        }
      : {
          namespace,
          name,
          latestVersion: version,
          versions: [newVersion]
        };

    this.agents.set(key, updated);
    this.artifacts.set(
      `${namespace}/${name}/${version}`,
      payload.artifacts.map((artifact) => ({
        path: artifact.path,
        mediaType: artifact.mediaType,
        content: Uint8Array.from(atob(artifact.content), (char) => char.charCodeAt(0)).buffer
      }))
    );

    return { namespace, name, version };
  }
}
