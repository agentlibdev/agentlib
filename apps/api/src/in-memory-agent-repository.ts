import type { AgentDetail, AgentListResult } from "../../../packages/core/src/agent-record.js";
import type { AgentRepository } from "../../../packages/core/src/agent-repository.js";

const seedAgent: AgentDetail = {
  namespace: "raul",
  name: "code-reviewer",
  latestVersion: "0.1.0",
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
  async listAgents(): Promise<AgentListResult> {
    return {
      items: [
        {
          namespace: seedAgent.namespace,
          name: seedAgent.name,
          latestVersion: seedAgent.latestVersion,
          title: seedAgent.versions[0].title,
          description: seedAgent.versions[0].description
        }
      ],
      nextCursor: null
    };
  }

  async getAgentDetail(namespace: string, name: string): Promise<AgentDetail | null> {
    if (namespace === seedAgent.namespace && name === seedAgent.name) {
      return seedAgent;
    }

    return null;
  }
}
