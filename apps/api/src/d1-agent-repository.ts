import type { AgentDetail, AgentListItem, AgentVersionRecord } from "../../../packages/core/src/agent-record.js";
import type { AgentRepository } from "../../../packages/core/src/agent-repository.js";

const LIST_AGENTS_SQL =
  "SELECT namespace, name, latest_version AS latestVersion, latest_title AS title, latest_description AS description FROM agent_list_view ORDER BY namespace, name LIMIT 50";

const GET_AGENT_DETAIL_SQL =
  "SELECT a.namespace, a.name, a.latest_version AS latestVersion, av.version, av.title, av.description, av.published_at AS publishedAt FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 ORDER BY av.published_at DESC";

type AgentListRow = AgentListItem;

type AgentDetailRow = {
  namespace: string;
  name: string;
  latestVersion: string;
  version: string;
  title: string;
  description: string;
  publishedAt: string;
};

export class D1AgentRepository implements AgentRepository {
  constructor(private readonly db: D1Database) {}

  async listAgents() {
    const result = await this.db.prepare(LIST_AGENTS_SQL).all<AgentListRow>();

    return {
      items: result.results,
      nextCursor: null
    };
  }

  async getAgentDetail(namespace: string, name: string): Promise<AgentDetail | null> {
    const result = await this.db
      .prepare(GET_AGENT_DETAIL_SQL)
      .bind(namespace, name)
      .all<AgentDetailRow>();

    if (result.results.length === 0) {
      return null;
    }

    const [firstRow] = result.results;
    const versions: AgentVersionRecord[] = result.results.map((row) => ({
      version: row.version,
      title: row.title,
      description: row.description,
      publishedAt: row.publishedAt
    }));

    return {
      namespace: firstRow.namespace,
      name: firstRow.name,
      latestVersion: firstRow.latestVersion,
      versions
    };
  }
}

export const d1Queries = {
  LIST_AGENTS_SQL,
  GET_AGENT_DETAIL_SQL
};
