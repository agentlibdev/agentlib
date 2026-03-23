import { createApp } from "./create-app.js";
import { createRepository } from "./create-repository.js";
import type { Env } from "./env.js";

function isWorkerHandledPath(pathname: string): boolean {
  return pathname === "/health" || pathname.startsWith("/api/");
}

export async function handleRequest(request: Request, env?: Env): Promise<Response> {
  return createApp(createRepository(env)).fetch(request);
}

const worker: ExportedHandler<Env> = {
  async fetch(request, env: Env): Promise<Response> {
    const pathname = new URL(request.url).pathname;

    if (!isWorkerHandledPath(pathname) && env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return handleRequest(request, env);
  }
};

export default worker;
