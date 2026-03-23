export type AgentListItem = {
  namespace: string;
  name: string;
  latestVersion: string;
  title: string;
  description: string;
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

export type AgentDetailResponse = {
  agent: {
    namespace: string;
    name: string;
    latestVersion: string;
  };
  versions: AgentVersionRecord[];
};

export type AgentVersionDetailResponse = {
  version: {
    namespace: string;
    name: string;
    version: string;
    title: string;
    description: string;
    license: string | null;
    manifestJson: string;
    publishedAt: string;
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
