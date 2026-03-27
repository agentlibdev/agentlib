import type { AgentRepository } from "@core/agent-repository.js";
import type { GithubImportRequest, PublishRequest } from "@core/agent-record.js";
import { parseGithubRepositoryUrl } from "@providers/github-import.js";
import { validateManifest } from "@validation/validate-manifest.js";
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

function isValidGithubImportRequest(value: unknown): value is GithubImportRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as GithubImportRequest;

  return (
    typeof candidate.repositoryUrl === "string" &&
    candidate.repositoryUrl.length > 0 &&
    (candidate.ref === undefined || typeof candidate.ref === "string")
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

      const artifactsMatch = url.pathname.match(
        /^\/api\/v1\/agents\/([^/]+)\/([^/]+)\/versions\/([^/]+)\/artifacts$/
      );
      if (request.method === "GET" && artifactsMatch) {
        const [, namespace, name, version] = artifactsMatch;
        const artifacts = await repository.listArtifacts(namespace, name, version);

        if (!artifacts) {
          return json(
            {
              error: {
                code: "artifacts_not_found",
                message: "Artifacts not found"
              }
            },
            { status: 404 }
          );
        }

        return json({ items: artifacts });
      }

      const artifactDownloadMatch = url.pathname.match(
        /^\/api\/v1\/agents\/([^/]+)\/([^/]+)\/versions\/([^/]+)\/artifacts\/(.+)$/
      );
      if (request.method === "GET" && artifactDownloadMatch) {
        const [, namespace, name, version, path] = artifactDownloadMatch;
        const artifact = await repository.getArtifactContent(
          namespace,
          name,
          version,
          decodeURIComponent(path)
        );

        if (!artifact) {
          return json(
            {
              error: {
                code: "artifact_not_found",
                message: "Artifact not found"
              }
            },
            { status: 404 }
          );
        }

        return new Response(new Blob([artifact.content], { type: artifact.mediaType }), {
          headers: {
            "content-type": artifact.mediaType
          }
        });
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

        if (!validateManifest(payload.manifest)) {
          return json(
            {
              error: {
                code: "invalid_manifest",
                message: "Manifest failed schema validation"
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

      if (request.method === "POST" && url.pathname === "/api/v1/providers/github/import") {
        const payload = await request.json();

        if (!isValidGithubImportRequest(payload)) {
          return json(
            {
              error: {
                code: "invalid_import_request",
                message: "GitHub import request is invalid"
              }
            },
            { status: 400 }
          );
        }

        const parsedRepository = parseGithubRepositoryUrl(payload.repositoryUrl);
        if (!parsedRepository) {
          return json(
            {
              error: {
                code: "unsupported_repository_url",
                message: "Repository URL is not a supported GitHub repository"
              }
            },
            { status: 400 }
          );
        }

        if (!repository.importGithubRepository) {
          return json(
            {
              error: {
                code: "github_import_unavailable",
                message: "GitHub import is not available"
              }
            },
            { status: 501 }
          );
        }

        try {
          const result = await repository.importGithubRepository({
            repositoryUrl: parsedRepository.repositoryUrl,
            ref: payload.ref
          });

          return json({ import: result }, { status: 201 });
        } catch (error) {
          if (error instanceof Error && error.message === "invalid_manifest") {
            return json(
              {
                error: {
                  code: "invalid_manifest",
                  message: "Imported manifest failed schema validation"
                }
              },
              { status: 422 }
            );
          }

          if (error instanceof Error && error.message === "repository_not_found") {
            return json(
              {
                error: {
                  code: "repository_not_found",
                  message: "Repository not found"
                }
              },
              { status: 404 }
            );
          }

          if (error instanceof Error && error.message === "manifest_not_found") {
            return json(
              {
                error: {
                  code: "manifest_not_found",
                  message: "agent.yaml not found in repository"
                }
              },
              { status: 404 }
            );
          }

          if (error instanceof Error && error.message === "github_upstream_error") {
            return json(
              {
                error: {
                  code: "github_upstream_error",
                  message: "GitHub returned an upstream error"
                }
              },
              { status: 502 }
            );
          }

          if (error instanceof Error && error.message === "github_rate_limited") {
            return json(
              {
                error: {
                  code: "github_rate_limited",
                  message: "GitHub rate limit exceeded during import"
                }
              },
              { status: 502 }
            );
          }

          throw error;
        }
      }

      const importDraftMatch = url.pathname.match(/^\/api\/v1\/imports\/([^/]+)$/);
      if (request.method === "GET" && importDraftMatch) {
        if (!repository.getImportDraft) {
          return json(
            {
              error: {
                code: "import_drafts_unavailable",
                message: "Import drafts are not available"
              }
            },
            { status: 501 }
          );
        }

        const [, importId] = importDraftMatch;
        const draft = await repository.getImportDraft(importId);

        if (!draft) {
          return json(
            {
              error: {
                code: "import_not_found",
                message: "Import draft not found"
              }
            },
            { status: 404 }
          );
        }

        return json({ import: draft });
      }

      const importPublishMatch = url.pathname.match(/^\/api\/v1\/imports\/([^/]+)\/publish$/);
      if (request.method === "POST" && importPublishMatch) {
        if (!repository.publishImportDraft) {
          return json(
            {
              error: {
                code: "import_publish_unavailable",
                message: "Import draft publish is not available"
              }
            },
            { status: 501 }
          );
        }

        const [, importId] = importPublishMatch;

        try {
          const result = await repository.publishImportDraft(importId);
          return json({ agent: result }, { status: 201 });
        } catch (error) {
          if (error instanceof Error && error.message === "import_not_found") {
            return json(
              {
                error: {
                  code: "import_not_found",
                  message: "Import draft not found"
                }
              },
              { status: 404 }
            );
          }

          if (error instanceof Error && error.message === "import_not_publishable") {
            return json(
              {
                error: {
                  code: "import_not_publishable",
                  message: "Import draft is not publishable"
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
