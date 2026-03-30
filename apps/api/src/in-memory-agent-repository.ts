import type {
  AccountProfileUpdateInput,
  AgentDetail,
  AgentLifecycleStatus,
  AgentLifecycleUpdateResult,
  AgentMetricResult,
  AccountSummary,
  AgentListResult,
  AgentVersionDetail,
  AgentVersionRecord,
  AuthenticatedUser,
  ArtifactContent,
  ArtifactRecord,
  GithubImportRequest,
  GithubImportResult,
  RegistryHighlights,
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
  lifecycleStatus: "active",
  ownerHandle: "raul",
  downloadCount: 0,
  pinCount: 0,
  starCount: 0,
  viewer: {
    hasPinned: false,
    hasStarred: false
  },
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
  private readonly profiles = new Map<string, InMemoryProfile>();
  private readonly agents = new Map<string, AgentDetail>([[`${seedAgent.namespace}/${seedAgent.name}`, seedAgent]]);
  private readonly artifacts = new Map<string, ArtifactContent[]>();
  private readonly imports = new Map<string, GithubImportResult>();
  private readonly metrics = new Map<string, { downloadCount: number; pinCount: number; starCount: number }>([
    [`${seedAgent.namespace}/${seedAgent.name}`, { downloadCount: 0, pinCount: 0, starCount: 0 }]
  ]);
  private readonly pins = new Set<string>();
  private readonly stars = new Set<string>();

  async listAgents(): Promise<AgentListResult> {
    const entries = [...this.agents.values()];
    return {
      items: entries.map((agent) => ({
        namespace: agent.namespace,
        name: agent.name,
        latestVersion: agent.latestVersion,
        title: agent.versions[0].title,
        description: agent.versions[0].description,
        lifecycleStatus: agent.lifecycleStatus,
        ownerHandle: agent.ownerHandle,
        ...(this.metrics.get(`${agent.namespace}/${agent.name}`) ?? {
          downloadCount: 0,
          pinCount: 0,
          starCount: 0
        })
      })),
      nextCursor: null
    };
  }

  async getRegistryHighlights(): Promise<RegistryHighlights> {
    const items = (await this.listAgents()).items;
    const topAgents = [...items]
      .sort((left, right) => {
        const scoreLeft = left.downloadCount * 3 + left.starCount * 2 + left.pinCount;
        const scoreRight = right.downloadCount * 3 + right.starCount * 2 + right.pinCount;
        return scoreRight - scoreLeft;
      })
      .slice(0, 6);

    return {
      stats: {
        totalAgents: items.length,
        totalDownloads: items.reduce((sum, item) => sum + item.downloadCount, 0),
        totalPins: items.reduce((sum, item) => sum + item.pinCount, 0),
        totalStars: items.reduce((sum, item) => sum + item.starCount, 0)
      },
      topAgents
    };
  }

  async getAccountSummary(actor: AuthenticatedUser): Promise<AccountSummary> {
    const profile = this.ensureProfile(actor);
    const ownedAgents = (await this.listAgents()).items.filter(
      (agent) => agent.ownerHandle === actor.handle
    );

    return {
      user: {
        handle: actor.handle,
        displayName: profile.displayName,
        ...(profile.email ? { email: profile.email } : {}),
        ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
        ...(profile.bio ? { bio: profile.bio } : {}),
        ...(profile.pronouns ? { pronouns: profile.pronouns } : {}),
        ...(profile.company ? { company: profile.company } : {}),
        ...(profile.location ? { location: profile.location } : {}),
        ...(profile.websiteUrl ? { websiteUrl: profile.websiteUrl } : {}),
        ...(profile.timeZoneName ? { timeZoneName: profile.timeZoneName } : {}),
        displayLocalTime: profile.displayLocalTime,
        ...(profile.statusEmoji ? { statusEmoji: profile.statusEmoji } : {}),
        ...(profile.statusText ? { statusText: profile.statusText } : {}),
        socialLinks: profile.socialLinks
      },
      identities: [
        {
          provider: actor.provider,
          handle: actor.handle,
          ...(actor.email ? { email: actor.email } : {})
        }
      ],
      ownedAgents,
      stats: {
        ownedAgentCount: ownedAgents.length,
        totalDownloads: ownedAgents.reduce((sum, agent) => sum + agent.downloadCount, 0),
        totalPins: ownedAgents.reduce((sum, agent) => sum + agent.pinCount, 0),
        totalStars: ownedAgents.reduce((sum, agent) => sum + agent.starCount, 0)
      },
      topAgent:
        [...ownedAgents].sort((left, right) => {
          const scoreLeft = left.downloadCount * 3 + left.starCount * 2 + left.pinCount;
          const scoreRight = right.downloadCount * 3 + right.starCount * 2 + right.pinCount;
          return scoreRight - scoreLeft;
        })[0] ?? null
    };
  }

  async updateAccountProfile(
    profile: AccountProfileUpdateInput,
    actor: AuthenticatedUser
  ): Promise<AccountSummary> {
    const existing = this.ensureProfile(actor);

    this.profiles.set(actor.handle, {
      ...existing,
      ...profile
    });

    return this.getAccountSummary(actor);
  }

  async getAgentDetail(
    namespace: string,
    name: string,
    actor?: AuthenticatedUser | null
  ): Promise<AgentDetail | null> {
    const detail = this.agents.get(`${namespace}/${name}`);
    if (!detail) {
      return null;
    }

    const pinKey = actor ? `${actor.handle}:${namespace}/${name}` : null;
    const starKey = actor ? `${actor.handle}:${namespace}/${name}` : null;

    return {
      ...detail,
      ...(this.metrics.get(`${namespace}/${name}`) ?? {
        downloadCount: 0,
        pinCount: 0,
        starCount: 0
      }),
      viewer: {
        hasPinned: pinKey ? this.pins.has(pinKey) : false,
        hasStarred: starKey ? this.stars.has(starKey) : false
      }
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
      publishedAt: versionRecord.publishedAt,
      lifecycleStatus: detail.lifecycleStatus,
      ownerHandle: detail.ownerHandle
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

  async publishAgentVersion(
    payload: PublishRequest,
    actor: AuthenticatedUser
  ): Promise<PublishResult> {
    const { namespace, name, version, title, description } = payload.manifest.metadata;
    const key = `${namespace}/${name}`;
    const existing = this.agents.get(key);

    if (existing) {
      if (existing.ownerHandle !== actor.handle) {
        throw new Error("forbidden_namespace");
      }
    } else if (namespace !== actor.handle) {
      throw new Error("forbidden_namespace");
    }

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
          lifecycleStatus: "active",
          ownerHandle: actor.handle,
          downloadCount: 0,
          pinCount: 0,
          starCount: 0,
          viewer: {
            hasPinned: false,
            hasStarred: false
          },
          versions: [newVersion]
        };

    this.agents.set(key, updated);
    this.metrics.set(key, this.metrics.get(key) ?? { downloadCount: 0, pinCount: 0, starCount: 0 });
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

  async importGithubRepository(
    payload: GithubImportRequest,
    actor: AuthenticatedUser
  ): Promise<GithubImportResult> {
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

    if (manifest.metadata.namespace !== actor.handle) {
      throw new Error("forbidden_namespace");
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

  async publishImportDraft(id: string, actor: AuthenticatedUser): Promise<PublishResult> {
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
    }, actor);

    this.imports.set(id, {
      ...draft,
      status: "published"
    });

    return result;
  }

  async updateAgentLifecycle(
    namespace: string,
    name: string,
    lifecycleStatus: AgentLifecycleStatus,
    actor: AuthenticatedUser
  ): Promise<AgentLifecycleUpdateResult> {
    const key = `${namespace}/${name}`;
    const existing = this.agents.get(key);

    if (!existing) {
      throw new Error("agent_not_found");
    }

    if (existing.ownerHandle !== actor.handle) {
      throw new Error("forbidden_namespace");
    }

    this.agents.set(key, {
      ...existing,
      lifecycleStatus
    });

    return {
      namespace,
      name,
      lifecycleStatus
    };
  }

  async recordAgentDownload(namespace: string, name: string): Promise<AgentMetricResult> {
    return this.updateMetrics(`${namespace}/${name}`, "downloadCount");
  }

  async addAgentPin(
    namespace: string,
    name: string,
    actor: AuthenticatedUser
  ): Promise<AgentMetricResult> {
    const key = `${actor.handle}:${namespace}/${name}`;
    if (!this.pins.has(key)) {
      this.pins.add(key);
      return this.updateMetrics(`${namespace}/${name}`, "pinCount");
    }

    return this.getMetricResult(`${namespace}/${name}`);
  }

  async addAgentStar(
    namespace: string,
    name: string,
    actor: AuthenticatedUser
  ): Promise<AgentMetricResult> {
    const key = `${actor.handle}:${namespace}/${name}`;
    if (!this.stars.has(key)) {
      this.stars.add(key);
      return this.updateMetrics(`${namespace}/${name}`, "starCount");
    }

    return this.getMetricResult(`${namespace}/${name}`);
  }

  async removeAgentPin(
    namespace: string,
    name: string,
    actor: AuthenticatedUser
  ): Promise<AgentMetricResult> {
    const key = `${actor.handle}:${namespace}/${name}`;
    if (this.pins.delete(key)) {
      return this.decrementMetrics(`${namespace}/${name}`, "pinCount");
    }

    return this.getMetricResult(`${namespace}/${name}`);
  }

  async removeAgentStar(
    namespace: string,
    name: string,
    actor: AuthenticatedUser
  ): Promise<AgentMetricResult> {
    const key = `${actor.handle}:${namespace}/${name}`;
    if (this.stars.delete(key)) {
      return this.decrementMetrics(`${namespace}/${name}`, "starCount");
    }

    return this.getMetricResult(`${namespace}/${name}`);
  }

  private ensureProfile(actor: AuthenticatedUser) {
    const existing = this.profiles.get(actor.handle);
    if (existing) {
      return existing;
    }

    const created: InMemoryProfile = {
      displayName: actor.displayName,
      ...(actor.email ? { email: actor.email } : {}),
      ...(actor.avatarUrl ? { avatarUrl: actor.avatarUrl } : {}),
      displayLocalTime: false,
      socialLinks: []
    };
    this.profiles.set(actor.handle, created);
    return created;
  }

  private updateMetrics(
    key: string,
    field: "downloadCount" | "pinCount" | "starCount"
  ): AgentMetricResult {
    const metric = this.metrics.get(key);
    if (!metric) {
      throw new Error("agent_not_found");
    }

    metric[field] += 1;
    this.metrics.set(key, metric);
    return this.getMetricResult(key);
  }

  private getMetricResult(key: string): AgentMetricResult {
    const [namespace, name] = key.split("/");
    const metric = this.metrics.get(key);
    if (!metric) {
      throw new Error("agent_not_found");
    }

    return {
      namespace,
      name,
      ...metric
    };
  }

  private decrementMetrics(
    key: string,
    field: "pinCount" | "starCount"
  ): AgentMetricResult {
    const metric = this.metrics.get(key);
    if (!metric) {
      throw new Error("agent_not_found");
    }

    metric[field] = Math.max(0, metric[field] - 1);
    this.metrics.set(key, metric);
    return this.getMetricResult(key);
  }
}

type InMemoryProfile = {
  displayName: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  pronouns?: string;
  company?: string;
  location?: string;
  websiteUrl?: string;
  timeZoneName?: string;
  displayLocalTime: boolean;
  statusEmoji?: string;
  statusText?: string;
  socialLinks: string[];
};
