import type {
  AgentDetail,
  AgentListResult,
  AgentVersionDetail,
  AgentVersionRecord,
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
  publishAgentVersion(payload: PublishRequest): Promise<PublishResult>;
}
