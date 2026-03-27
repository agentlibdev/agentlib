import type {
  AgentDetail,
  AgentListResult,
  AgentVersionDetail,
  AgentVersionRecord,
  ArtifactContent,
  ArtifactRecord,
  GithubImportRequest,
  GithubImportResult,
  PublishRequest,
  PublishResult
} from "@core/agent-record.js";
import type { AgentRepository } from "@core/agent-repository.js";
import { validateManifest } from "@validation/validate-manifest.js";
import { parseGithubRepositoryUrl } from "@providers/github-import.js";

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
  private readonly imports = new Map<string, GithubImportResult>();

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

  async importGithubRepository(payload: GithubImportRequest): Promise<GithubImportResult> {
    const parsedRepository = parseGithubRepositoryUrl(payload.repositoryUrl);
    if (!parsedRepository) {
      throw new Error("unsupported_repository_url");
    }

    const manifest = {
      apiVersion: "agentlib.dev/v1alpha1",
      kind: "Agent",
      metadata: {
        namespace: parsedRepository.owner,
        name: parsedRepository.repo,
        version: "0.4.0",
        title: "Imported GitHub Agent",
        description: "Preview manifest imported from a GitHub repository."
      },
      spec: {
        summary: "Preview manifest imported from a GitHub repository.",
        inputs: [],
        outputs: [],
        tools: []
      }
    };

    if (!validateManifest(manifest)) {
      throw new Error("invalid_manifest");
    }

    const draft: GithubImportResult = {
      id: `import_draft_github_${parsedRepository.owner}_${parsedRepository.repo}_${payload.ref ?? "main"}`,
      status: "draft",
      provider: "github",
      repository: {
        externalId: `${parsedRepository.owner}/${parsedRepository.repo}`,
        url: parsedRepository.repositoryUrl,
        owner: parsedRepository.owner,
        name: parsedRepository.repo,
        defaultBranch: payload.ref ?? "main",
        resolvedRef: payload.ref ?? "main"
      },
      manifest: {
        namespace: manifest.metadata.namespace,
        name: manifest.metadata.name,
        version: manifest.metadata.version,
        title: manifest.metadata.title,
        description: manifest.metadata.description
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
      sourceRepositoryId: `source_repo_github_${parsedRepository.owner}_${parsedRepository.repo}`
    };

    this.imports.set(draft.id, draft);

    return draft;
  }

  async getImportDraft(id: string): Promise<GithubImportResult | null> {
    return this.imports.get(id) ?? null;
  }

  async publishImportDraft(id: string): Promise<PublishResult> {
    const draft = this.imports.get(id);

    if (!draft) {
      throw new Error("import_not_found");
    }

    if (draft.status !== "draft") {
      throw new Error("import_not_publishable");
    }

    const result = await this.publishAgentVersion({
      manifest: {
        metadata: {
          namespace: draft.manifest.namespace,
          name: draft.manifest.name,
          version: draft.manifest.version,
          title: draft.manifest.title,
          description: draft.manifest.description
        }
      },
      readme: draft.readme,
      artifacts: [
        {
          path: "README.md",
          mediaType: "text/markdown",
          content: Buffer.from(draft.readme).toString("base64")
        },
        {
          path: "agent.yaml",
          mediaType: "application/yaml",
          content: Buffer.from("apiVersion: agentlib.dev/v1alpha1\nkind: Agent\n").toString("base64")
        }
      ]
    });

    this.imports.set(id, {
      ...draft,
      status: "published"
    });

    return result;
  }
}
