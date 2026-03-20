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

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};
