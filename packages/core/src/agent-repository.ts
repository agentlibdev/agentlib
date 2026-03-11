import type { AgentDetail, AgentListResult } from "./agent-record.js";

export interface AgentRepository {
  listAgents(): Promise<AgentListResult>;
  getAgentDetail(namespace: string, name: string): Promise<AgentDetail | null>;
}
