import { createApp } from "./create-app.js";
import { createRepository } from "./create-repository.js";
import type { Env } from "./env.js";

export async function handleRequest(request: Request): Promise<Response> {
  return createApp(createRepository()).fetch(request);
}

const worker: ExportedHandler<Env> = {
  async fetch(request, env: Env): Promise<Response> {
    return createApp(createRepository(env)).fetch(request);
  }
};

export default worker;
