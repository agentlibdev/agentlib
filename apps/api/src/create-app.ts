import type { AgentRepository } from "../../../packages/core/src/agent-repository.js";
import type { PublishRequest } from "../../../packages/core/src/agent-record.js";
import type { Env } from "./env.js";

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

function isValidPublishRequest(value: unknown): value is PublishRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as PublishRequest;
  const metadata = candidate.manifest?.metadata;

  return Boolean(
    metadata?.namespace &&
      metadata?.name &&
      metadata?.version &&
      metadata?.title &&
      metadata?.description &&
      typeof candidate.readme === "string" &&
      Array.isArray(candidate.artifacts)
  );
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

      const versionsMatch = url.pathname.match(/^\/api\/v1\/agents\/([^/]+)\/([^/]+)\/versions$/);
      if (request.method === "GET" && versionsMatch) {
        const [, namespace, name] = versionsMatch;
        const versions = await repository.listAgentVersions(namespace, name);

        if (!versions) {
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

        return json({ items: versions });
      }

      const versionDetailMatch = url.pathname.match(
        /^\/api\/v1\/agents\/([^/]+)\/([^/]+)\/versions\/([^/]+)$/
      );
      if (request.method === "GET" && versionDetailMatch) {
        const [, namespace, name, version] = versionDetailMatch;
        const detail = await repository.getAgentVersionDetail(namespace, name, version);

        if (!detail) {
          return json(
            {
              error: {
                code: "agent_version_not_found",
                message: "Agent version not found"
              }
            },
            { status: 404 }
          );
        }

        return json({ version: detail });
      }

      if (request.method === "POST" && url.pathname === "/api/v1/publish") {
        const payload = await request.json();

        if (!isValidPublishRequest(payload)) {
          return json(
            {
              error: {
                code: "invalid_publish_request",
                message: "Publish request is invalid"
              }
            },
            { status: 400 }
          );
        }

        try {
          const result = await repository.publishAgentVersion(payload);

          return json(
            {
              agent: result
            },
            { status: 201 }
          );
        } catch (error) {
          if (error instanceof Error && error.message === "version_exists") {
            return json(
              {
                error: {
                  code: "version_exists",
                  message: "Agent version already exists"
                }
              },
              { status: 409 }
            );
          }

          throw error;
        }
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

export function createWorkerApp(env?: Env): ExportedHandler {
  return {
    async fetch(request): Promise<Response> {
      const { createRepository } = await import("./create-repository.js");
      const repository = createRepository(env);
      const app = createApp(repository);
      return app.fetch(request);
    }
  };
}
