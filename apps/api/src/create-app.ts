import type { AgentRepository } from "../../../packages/core/src/agent-repository.js";

export type App = {
  fetch(request: Request): Promise<Response>;
};

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {})
    }
  });
}

export function createApp(repository: AgentRepository): App {
  return {
    async fetch(request): Promise<Response> {
      const url = new URL(request.url);

      if (request.method === "GET" && url.pathname === "/health") {
        return json({
          ok: true,
          service: "agentlib-api"
        });
      }

      if (request.method === "GET" && url.pathname === "/api/v1/agents") {
        const result = await repository.listAgents();

        return json({
          items: result.items,
          page: {
            nextCursor: result.nextCursor
          }
        });
      }

      const agentMatch = url.pathname.match(/^\/api\/v1\/agents\/([^/]+)\/([^/]+)$/);
      if (request.method === "GET" && agentMatch) {
        const [, namespace, name] = agentMatch;
        const detail = await repository.getAgentDetail(namespace, name);

        if (!detail) {
          return json(
            {
              error: {
                code: "agent_not_found",
                message: "Agent not found"
              }
            },
            { status: 404 }
          );
        }

        return json({
          agent: {
            namespace: detail.namespace,
            name: detail.name,
            latestVersion: detail.latestVersion
          },
          versions: detail.versions
        });
      }

      return json(
        {
          error: {
            code: "not_found",
            message: "Route not found"
          }
        },
        { status: 404 }
      );
    }
  };
}
