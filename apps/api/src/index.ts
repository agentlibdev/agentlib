import { createApp } from "./create-app.js";
import { InMemoryAgentRepository } from "./in-memory-agent-repository.js";

const app = createApp(new InMemoryAgentRepository());

export async function handleRequest(request: Request): Promise<Response> {
  return app.fetch(request);
}

const worker: ExportedHandler = {
  async fetch(request): Promise<Response> {
    return handleRequest(request);
  }
};

export default worker;
