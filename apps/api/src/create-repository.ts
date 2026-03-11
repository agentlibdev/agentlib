import type { AgentRepository } from "../../../packages/core/src/agent-repository.js";
import type { Env } from "./env.js";
import { D1AgentRepository } from "./d1-agent-repository.js";
import { InMemoryAgentRepository } from "./in-memory-agent-repository.js";

export function createRepository(env?: Env): AgentRepository {
  if (env?.DB) {
    return new D1AgentRepository(env.DB);
  }

  return new InMemoryAgentRepository();
}
