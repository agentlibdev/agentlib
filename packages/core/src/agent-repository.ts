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
} from "./agent-record.js";

export interface AgentRepository {
  listAgents(): Promise<AgentListResult>;
  getAgentDetail(namespace: string, name: string): Promise<AgentDetail | null>;
  listAgentVersions(namespace: string, name: string): Promise<AgentVersionRecord[] | null>;
  getAgentVersionDetail(
    namespace: string,
    name: string,
    version: string
  ): Promise<AgentVersionDetail | null>;
  listArtifacts(
    namespace: string,
    name: string,
    version: string
  ): Promise<ArtifactRecord[] | null>;
  getArtifactContent(
    namespace: string,
    name: string,
    version: string,
    path: string
  ): Promise<ArtifactContent | null>;
  publishAgentVersion(payload: PublishRequest): Promise<PublishResult>;
  importGithubRepository?(payload: GithubImportRequest): Promise<GithubImportResult>;
}
