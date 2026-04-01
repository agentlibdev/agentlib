export type AgentListItem = {
  namespace: string;
  name: string;
  latestVersion: string;
  title: string;
  description: string;
  lifecycleStatus: AgentLifecycleStatus;
  ownerHandle: string;
  downloadCount: number;
  pinCount: number;
  starCount: number;
};

export type AgentLifecycleStatus = "active" | "deprecated" | "unmaintained";

export type AgentNamespaceType = "official" | "community" | "mirror";

export type AgentVerificationStatus =
  | "unofficial"
  | "verified_mirror"
  | "claimed_by_upstream"
  | "official";

export type AgentAuthority = {
  namespaceType: AgentNamespaceType;
  verificationStatus: AgentVerificationStatus;
  canonicalNamespace: string;
  canonicalName: string;
  claimedByNamespace: string | null;
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

export type AuthenticatedUser = {
  provider: "github" | "google";
  subject: string;
  handle: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
};

export type LinkedIdentity = {
  provider: "github" | "google";
  handle: string;
  email?: string;
};

export type AccountProfile = {
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

export type AccountProfileUpdateInput = {
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

export type AccountSummary = {
  user: AccountProfile;
  identities: LinkedIdentity[];
  ownedAgents: AgentListItem[];
  stats: {
    ownedAgentCount: number;
    totalDownloads: number;
    totalPins: number;
    totalStars: number;
  };
  topAgent: AgentListItem | null;
};

export type RegistryHighlights = {
  stats: {
    totalAgents: number;
    totalDownloads: number;
    totalPins: number;
    totalStars: number;
  };
  topAgents: AgentListItem[];
};

export type AgentListResult = {
  items: AgentListItem[];
  nextCursor: string | null;
};

export type AgentVersionRecord = {
  version: string;
  title: string;
  description: string;
  publishedAt: string;
};

export type AgentDetail = {
  namespace: string;
  name: string;
  latestVersion: string;
  lifecycleStatus: AgentLifecycleStatus;
  ownerHandle: string;
  authority: AgentAuthority;
  provenance: AgentProvenance;
  downloadCount: number;
  pinCount: number;
  starCount: number;
  viewer: {
    hasPinned: boolean;
    hasStarred: boolean;
  };
  versions: AgentVersionRecord[];
};

export type AgentVersionDetail = {
  namespace: string;
  name: string;
  version: string;
  title: string;
  description: string;
  license: string | null;
  manifestJson: string;
  publishedAt: string;
  lifecycleStatus: AgentLifecycleStatus;
  ownerHandle: string;
  authority: AgentAuthority;
  provenance: AgentProvenance;
};

export type PublishArtifactInput = {
  path: string;
  mediaType: string;
  content: string;
};

export type ImportDraftArtifact = {
  path: string;
  mediaType: string;
  sizeBytes: number;
};

export type PublishManifestMetadata = {
  namespace: string;
  name: string;
  version: string;
  title: string;
  description: string;
  license?: string;
};

export type PublishRequest = {
  manifest: {
    metadata: PublishManifestMetadata;
  };
  readme: string;
  artifacts: PublishArtifactInput[];
};

export type PublishResult = {
  namespace: string;
  name: string;
  version: string;
};

export type AgentLifecycleUpdateResult = {
  namespace: string;
  name: string;
  lifecycleStatus: AgentLifecycleStatus;
};

export type AgentMetricResult = {
  namespace: string;
  name: string;
  downloadCount: number;
  pinCount: number;
  starCount: number;
};

export type GithubImportRequest = {
  repositoryUrl: string;
  ref?: string;
};

export type ImportDraftStatus = "draft" | "published";

export type GithubImportResult = {
  id: string;
  status: ImportDraftStatus;
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

export type ArtifactRecord = {
  path: string;
  mediaType: string;
  sizeBytes: number;
};

export type ArtifactContent = {
  path: string;
  mediaType: string;
  content: ArrayBuffer;
};
