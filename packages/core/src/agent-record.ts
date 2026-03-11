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
