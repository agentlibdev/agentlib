export type AgentListItem = {
  namespace: string;
  name: string;
  packageKind: AgentPackageKind;
  latestVersion: string;
  title: string;
  description: string;
  lifecycleStatus: "active" | "deprecated" | "unmaintained";
  ownerHandle: string;
  compatibility: AgentCompatibility;
  downloadCount: number;
  pinCount: number;
  starCount: number;
};

export type AgentListResponse = {
  items: AgentListItem[];
  page: {
    nextCursor: string | null;
  };
};

export type AgentVersionRecord = {
  version: string;
  title: string;
  description: string;
  publishedAt: string;
};

export type AgentPackageKind = "agent" | "agent-skill" | "repository-snapshot";

export type AgentTargetCompatibility = {
  targetId: string;
  builtFor: boolean;
  tested: boolean;
  adapterAvailable: boolean;
};

export type AgentCompatibility = {
  targets: AgentTargetCompatibility[];
};

export type AgentProvenance = {
  sourceType: "manual" | "github" | "gitlab" | "bitbucket" | "upload";
  sourceUrl: string | null;
  sourceRepositoryUrl: string | null;
  originalAuthorHandle: string | null;
  originalAuthorName: string | null;
  originalAuthorUrl: string | null;
  submittedByHandle: string | null;
  submittedByName: string | null;
};

export type AgentDetailResponse = {
  agent: {
    namespace: string;
    name: string;
    packageKind: AgentPackageKind;
    latestVersion: string;
    lifecycleStatus: "active" | "deprecated" | "unmaintained";
    ownerHandle: string;
    provenance: AgentProvenance;
    compatibility: AgentCompatibility;
    downloadCount: number;
    pinCount: number;
    starCount: number;
    viewer: {
      hasPinned: boolean;
      hasStarred: boolean;
    };
  };
  versions: AgentVersionRecord[];
};

export type AgentVersionDetailResponse = {
  version: {
    namespace: string;
    name: string;
    packageKind: AgentPackageKind;
    version: string;
    title: string;
    description: string;
    license: string | null;
    manifestJson: string;
    publishedAt: string;
    lifecycleStatus: "active" | "deprecated" | "unmaintained";
    ownerHandle: string;
    provenance: AgentProvenance;
    compatibility: AgentCompatibility;
  };
};

export type SessionResponse = {
  session: {
    provider: "github" | "google";
    subject: string;
    handle: string;
    displayName: string;
    email?: string;
    avatarUrl?: string;
  } | null;
};

export type AccountSummaryResponse = {
  account: {
    user: {
      handle: string;
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
    identities: Array<{
      provider: "github" | "google";
      handle: string;
      email?: string;
    }>;
    ownedAgents: AgentListItem[];
    stats: {
      ownedAgentCount: number;
      totalDownloads: number;
      totalPins: number;
      totalStars: number;
    };
    topAgent: AgentListItem | null;
  };
};

export type AccountProfileUpdateRequest = {
  profile: {
    displayName: string;
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
};

export type RegistryHighlightsResponse = {
  highlights: {
    stats: {
      totalAgents: number;
      totalDownloads: number;
      totalPins: number;
      totalStars: number;
    };
    topAgents: AgentListItem[];
  };
};

export type AgentMetricsResponse = {
  metrics: {
    namespace: string;
    name: string;
    downloadCount: number;
    pinCount: number;
    starCount: number;
  };
};

export type AgentLifecycleUpdateResponse = {
  agent: {
    namespace: string;
    name: string;
    lifecycleStatus: "active" | "deprecated" | "unmaintained";
  };
};

export type ArtifactItem = {
  path: string;
  mediaType: string;
  sizeBytes: number;
};

export type ArtifactListResponse = {
  items: ArtifactItem[];
};

export type ArtifactPreviewResponse = {
  artifact: {
    path: string;
    mediaType: string;
    sizeBytes: number;
  };
  preview: {
    kind: "markdown" | "json" | "text";
    text: string;
  };
};

export type PublishArtifactInput = {
  path: string;
  mediaType: string;
  content: string;
};

export type PublishRequest = {
  packageKind?: AgentPackageKind;
  manifest: {
    apiVersion: "agentlib.dev/v1alpha1";
    kind: "Agent";
    metadata: {
      namespace: string;
      name: string;
      version: string;
      title: string;
      description: string;
      license?: string;
    };
    spec: {
      summary: string;
      inputs: [];
      outputs: [];
      tools: [];
    } | Record<string, unknown>;
  };
  compatibility?: AgentCompatibility;
  readme: string;
  artifacts: PublishArtifactInput[];
};

export type PublishResponse = {
  agent: {
    namespace: string;
    name: string;
    version: string;
  };
};

export type AgentVersionCompatibilityUpdateRequest = {
  compatibility: AgentCompatibility;
};

export type AgentVersionCompatibilityUpdateResponse = {
  version: AgentVersionDetailResponse["version"];
};

export type ImportDraftArtifact = {
  path: string;
  mediaType: string;
  sizeBytes: number;
};

export type ImportDraftRecord = {
  id: string;
  status: "draft" | "published";
  provider: "github";
  repository: {
    externalId: string;
    url: string;
    owner: string;
    name: string;
    defaultBranch: string;
    resolvedRef: string;
  };
  manifest: {
    namespace: string;
    name: string;
    version: string;
    title: string;
    description: string;
  };
  readme: string;
  artifacts: ImportDraftArtifact[];
  sourceRepositoryId: string;
};

export type ImportDraftResponse = {
  import: ImportDraftRecord;
};

export type GithubImportRequest = {
  repositoryUrl: string;
  ref?: string;
};

export type GithubImportCreateResponse = {
  import: ImportDraftRecord;
};

export type ImportPublishResponse = {
  agent: {
    namespace: string;
    name: string;
    version: string;
  };
};

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};
