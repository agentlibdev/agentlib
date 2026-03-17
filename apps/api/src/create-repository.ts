import type { AgentRepository } from "../../../packages/core/src/agent-repository.js";
import type { Env } from "./env.js";
import { D1AgentRepository } from "./d1-agent-repository.js";
import { InMemoryAgentRepository } from "./in-memory-agent-repository.js";
import { R2ArtifactStorage } from "./r2-artifact-storage.js";

export function createRepository(env?: Env): AgentRepository {
  if (env?.DB && env.ARTIFACTS) {
    return new D1AgentRepository(env.DB, new R2ArtifactStorage(env.ARTIFACTS));
  }

  return new InMemoryAgentRepository();
}
