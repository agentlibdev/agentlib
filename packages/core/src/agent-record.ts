export type AgentListItem = {
  namespace: string;
  name: string;
  latestVersion: string;
  title: string;
  description: string;
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
};

export type PublishArtifactInput = {
  path: string;
  mediaType: string;
  content: string;
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

export type ArtifactRecord = {
  path: string;
  mediaType: string;
  sizeBytes: number;
};

export type ArtifactContent = {
  path: string;
  mediaType: string;
  content: string;
};
