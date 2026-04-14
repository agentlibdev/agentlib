import type { AgentRepository } from "@core/agent-repository.js";
import { zipSync } from "fflate";
import type {
  AccountProfileUpdateInput,
  AgentCompatibility,
  AgentLifecycleStatus,
  AgentPackageKind,
  GithubImportRequest,
  PublishRequest
} from "@core/agent-record.js";
import { parseGithubRepositoryUrl } from "@providers/github-import.js";
import { validateManifest } from "@validation/validate-manifest.js";
import { createAuthGateway } from "./auth.js";
import type { AuthGateway } from "./auth.js";
import type { Env } from "./env.js";

export type App = {
  fetch(request: Request): Promise<Response>;
};

const textDecoder = new TextDecoder();

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
      isValidPackageKind(candidate.packageKind) &&
      isValidCompatibility(candidate.compatibility) &&
      Array.isArray(candidate.artifacts)
  );
}

function isValidPackageKind(value: unknown): value is AgentPackageKind | undefined {
  return (
    value === undefined ||
    value === "agent" ||
    value === "agent-skill" ||
    value === "repository-snapshot"
  );
}

function isValidCompatibility(value: unknown): value is AgentCompatibility | undefined {
  if (value === undefined) {
    return true;
  }

  if (!value || typeof value !== "object" || !Array.isArray((value as AgentCompatibility).targets)) {
    return false;
  }

  return (value as AgentCompatibility).targets.every(
    (target) =>
      typeof target?.targetId === "string" &&
      target.targetId.trim().length > 0 &&
      typeof target.builtFor === "boolean" &&
      typeof target.tested === "boolean" &&
      typeof target.adapterAvailable === "boolean"
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

function isValidLifecycleStatus(value: unknown): value is AgentLifecycleStatus {
  return value === "active" || value === "deprecated" || value === "unmaintained";
}

function isValidAccountProfile(value: unknown): value is AccountProfileUpdateInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.displayName !== "string" || candidate.displayName.trim().length === 0) {
    return false;
  }

  const maybeStrings = [
    "bio",
    "pronouns",
    "company",
    "location",
    "websiteUrl",
    "timeZoneName",
    "statusEmoji",
    "statusText"
  ];
  for (const key of maybeStrings) {
    if (candidate[key] !== undefined && typeof candidate[key] !== "string") {
      return false;
    }
  }

  if (typeof candidate.displayLocalTime !== "boolean") {
    return false;
  }

  if (
    !Array.isArray(candidate.socialLinks) ||
    !candidate.socialLinks.every(
      (entry) =>
        typeof entry === "string" &&
        /^https?:\/\//.test(entry) &&
        entry.trim().length > 0
    )
  ) {
    return false;
  }

  return true;
}

function isTextPreviewableArtifact(path: string, mediaType: string): boolean {
  const normalizedPath = path.toLowerCase();
  const normalizedMediaType = mediaType.toLowerCase();

  if (normalizedMediaType.startsWith("text/")) {
    return true;
  }

  return [
    "application/json",
    "application/ld+json",
    "application/yaml",
    "application/x-yaml",
    "application/xml"
  ].includes(normalizedMediaType) || [
    ".md",
    ".markdown",
    ".txt",
    ".json",
    ".yaml",
    ".yml",
    ".xml",
    ".log"
  ].some((extension) => normalizedPath.endsWith(extension));
}

function resolveArtifactPreviewKind(
  path: string,
  mediaType: string
): "markdown" | "json" | "text" {
  const normalizedPath = path.toLowerCase();
  const normalizedMediaType = mediaType.toLowerCase();

  if (
    normalizedMediaType === "text/markdown" ||
    normalizedPath.endsWith(".md") ||
    normalizedPath.endsWith(".markdown")
  ) {
    return "markdown";
  }

  if (
    normalizedMediaType.includes("json") ||
    normalizedPath.endsWith(".json")
  ) {
    return "json";
  }

  return "text";
}

function buildVersionBundleFilename(namespace: string, name: string, version: string): string {
  return `${namespace}-${name}-${version}.zip`.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function shouldRecordDownload(url: URL): boolean {
  return url.searchParams.get("tracked") !== "1";
}

export function createApp(
  repository: AgentRepository,
  authGateway: AuthGateway = createAuthGateway({})
): App {
  return {
    async fetch(request): Promise<Response> {
      const url = new URL(request.url);

      if (request.method === "GET" && url.pathname === "/health") {
        return json({
          ok: true,
          service: "agentlib-api"
        });
      }

      const authStartMatch = url.pathname.match(/^\/api\/v1\/auth\/(github|google)\/start$/);
      if (request.method === "GET" && authStartMatch) {
        return authGateway.startAuthorization(authStartMatch[1] as "github" | "google", request);
      }

      const authCallbackMatch = url.pathname.match(/^\/api\/v1\/auth\/(github|google)\/callback$/);
      if (request.method === "GET" && authCallbackMatch) {
        return authGateway.finishAuthorization(
          authCallbackMatch[1] as "github" | "google",
          request
        );
      }

      if (request.method === "POST" && url.pathname === "/api/v1/auth/logout") {
        return authGateway.logout(request);
      }

      const actor = await authGateway.getSession(request);

      if (request.method === "GET" && url.pathname === "/api/v1/session") {
        return json({
          session: actor
        });
      }

      if (request.method === "GET" && url.pathname === "/api/v1/account") {
        if (!actor) {
          return json(
            {
              error: {
                code: "authentication_required",
                message: "Authentication is required for this operation"
              }
            },
            { status: 401 }
          );
        }

        if (!repository.getAccountSummary) {
          return json(
            {
              error: {
                code: "account_unavailable",
                message: "Account summary is not available"
              }
            },
            { status: 501 }
          );
        }

        return json({
          account: await repository.getAccountSummary(actor)
        });
      }

      if (request.method === "PATCH" && url.pathname === "/api/v1/account") {
        if (!actor) {
          return json(
            {
              error: {
                code: "authentication_required",
                message: "Authentication is required for this operation"
              }
            },
            { status: 401 }
          );
        }

        if (!repository.updateAccountProfile) {
          return json(
            {
              error: {
                code: "account_unavailable",
                message: "Account profile updates are not available"
              }
            },
            { status: 501 }
          );
        }

        const payload = (await request.json()) as { profile?: unknown };
        if (!isValidAccountProfile(payload.profile)) {
          return json(
            {
              error: {
                code: "invalid_account_profile",
                message: "Account profile payload is invalid"
              }
            },
            { status: 400 }
          );
        }

        return json({
          account: await repository.updateAccountProfile(payload.profile, actor)
        });
      }

      if (request.method === "GET" && url.pathname === "/api/v1/highlights") {
        if (!repository.getRegistryHighlights) {
          return json(
            {
              error: {
                code: "highlights_unavailable",
                message: "Registry highlights are not available"
              }
            },
            { status: 501 }
          );
        }

        return json({
          highlights: await repository.getRegistryHighlights()
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
        const detail = await repository.getAgentDetail(namespace, name, actor);

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
            packageKind: detail.packageKind,
            latestVersion: detail.latestVersion,
            lifecycleStatus: detail.lifecycleStatus,
            ownerHandle: detail.ownerHandle,
            authority: detail.authority,
            provenance: detail.provenance,
            compatibility: detail.compatibility,
            downloadCount: detail.downloadCount,
            pinCount: detail.pinCount,
            starCount: detail.starCount,
            viewer: detail.viewer
          },
          versions: detail.versions
        });
      }

      const agentMetricsMatch = url.pathname.match(/^\/api\/v1\/agents\/([^/]+)\/([^/]+)\/(downloads|pins|stars)$/);
      if ((request.method === "POST" || request.method === "DELETE") && agentMetricsMatch) {
        const [, namespace, name, action] = agentMetricsMatch;

        if (action !== "downloads" && !actor) {
          return json(
            {
              error: {
                code: "authentication_required",
                message: "Authentication is required for this operation"
              }
            },
            { status: 401 }
          );
        }

        try {
          const result = request.method === "POST"
            ? action === "downloads"
              ? await repository.recordAgentDownload?.(namespace, name)
              : action === "pins"
                ? await repository.addAgentPin?.(namespace, name, actor!)
                : await repository.addAgentStar?.(namespace, name, actor!)
            : action === "pins"
              ? await repository.removeAgentPin?.(namespace, name, actor!)
              : await repository.removeAgentStar?.(namespace, name, actor!);

          if (!result) {
            return json(
              {
                error: {
                  code: "metrics_unavailable",
                  message: "Agent metrics are not available"
                }
              },
              { status: 501 }
            );
          }

          return json({ metrics: result }, { status: request.method === "POST" ? 201 : 200 });
        } catch (error) {
          if (error instanceof Error && error.message === "agent_not_found") {
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

          throw error;
        }
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

      if (request.method === "PATCH" && versionDetailMatch) {
        if (!actor) {
          return json(
            {
              error: {
                code: "authentication_required",
                message: "Authentication is required for this operation"
              }
            },
            { status: 401 }
          );
        }

        const payload = await request.json().catch(() => null) as { compatibility?: AgentCompatibility } | null;
        if (!payload || !isValidCompatibility(payload.compatibility) || payload.compatibility === undefined) {
          return json(
            {
              error: {
                code: "invalid_request",
                message: "Compatibility payload is invalid"
              }
            },
            { status: 400 }
          );
        }

        const [, namespace, name, version] = versionDetailMatch;

        try {
          const result = await repository.updateAgentVersionCompatibility?.(
            namespace,
            name,
            version,
            payload.compatibility,
            actor
          );

          if (!result) {
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

          return json({ version: result });
        } catch (error) {
          if (error instanceof Error && error.message === "forbidden_version_update") {
            return json(
              {
                error: {
                  code: "forbidden",
                  message: "You cannot edit this version"
                }
              },
              { status: 403 }
            );
          }

          throw error;
        }
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

      const artifactPreviewMatch = url.pathname.match(
        /^\/api\/v1\/agents\/([^/]+)\/([^/]+)\/versions\/([^/]+)\/artifacts\/(.+)\/content$/
      );
      if (request.method === "GET" && artifactPreviewMatch) {
        const [, namespace, name, version, path] = artifactPreviewMatch;
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

        if (!isTextPreviewableArtifact(artifact.path, artifact.mediaType)) {
          return json(
            {
              error: {
                code: "artifact_preview_not_supported",
                message: "Artifact preview is only available for text-based files"
              }
            },
            { status: 415 }
          );
        }

        return json({
          artifact: {
            path: artifact.path,
            mediaType: artifact.mediaType,
            sizeBytes: artifact.content.byteLength
          },
          preview: {
            kind: resolveArtifactPreviewKind(artifact.path, artifact.mediaType),
            text: textDecoder.decode(artifact.content)
          }
        });
      }

      const versionBundleMatch = url.pathname.match(
        /^\/api\/v1\/agents\/([^/]+)\/([^/]+)\/versions\/([^/]+)\/download\.zip$/
      );
      if (request.method === "GET" && versionBundleMatch) {
        const [, namespace, name, version] = versionBundleMatch;

        if (!repository.listArtifactContents) {
          return json(
            {
              error: {
                code: "bundle_download_unavailable",
                message: "Artifact bundle download is not available"
              }
            },
            { status: 501 }
          );
        }

        const artifacts = await repository.listArtifactContents(namespace, name, version);
        if (!artifacts || artifacts.length === 0) {
          return json(
            {
              error: {
                code: "bundle_not_found",
                message: "Artifact bundle not found"
              }
            },
            { status: 404 }
          );
        }

        const archive = zipSync(
          Object.fromEntries(
            artifacts.map((artifact) => [artifact.path, new Uint8Array(artifact.content)])
          )
        );
        const archiveBody = new Uint8Array(archive.byteLength);
        archiveBody.set(archive);

        if (shouldRecordDownload(url) && repository.recordAgentDownload) {
          void repository.recordAgentDownload(namespace, name);
        }

        return new Response(archiveBody.buffer, {
          headers: {
            "content-type": "application/zip",
            "content-disposition": `attachment; filename="${buildVersionBundleFilename(
              namespace,
              name,
              version
            )}"`
          }
        });
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

        if (shouldRecordDownload(url) && repository.recordAgentDownload) {
          void repository.recordAgentDownload(namespace, name);
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

        if (!actor) {
          return json(
            {
              error: {
                code: "authentication_required",
                message: "Authentication is required for this operation"
              }
            },
            { status: 401 }
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
          const result = await repository.publishAgentVersion(payload, actor);

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
        if (!actor) {
          return json(
            {
              error: {
                code: "authentication_required",
                message: "Authentication is required for this operation"
              }
            },
            { status: 401 }
          );
        }

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
          }, actor);

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
        if (!actor) {
          return json(
            {
              error: {
                code: "authentication_required",
                message: "Authentication is required for this operation"
              }
            },
            { status: 401 }
          );
        }

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
          const result = await repository.publishImportDraft(importId, actor);
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

      const agentLifecycleMatch = url.pathname.match(/^\/api\/v1\/agents\/([^/]+)\/([^/]+)$/);
      if (request.method === "PATCH" && agentLifecycleMatch) {
        if (!actor) {
          return json(
            {
              error: {
                code: "authentication_required",
                message: "Authentication is required for this operation"
              }
            },
            { status: 401 }
          );
        }

        if (!repository.updateAgentLifecycle) {
          return json(
            {
              error: {
                code: "lifecycle_updates_unavailable",
                message: "Lifecycle updates are not available"
              }
            },
            { status: 501 }
          );
        }

        const payload = await request.json();
        const lifecycleStatus =
          payload && typeof payload === "object" && "lifecycleStatus" in payload
            ? payload.lifecycleStatus
            : undefined;
        if (!isValidLifecycleStatus(lifecycleStatus)) {
          return json(
            {
              error: {
                code: "invalid_lifecycle_request",
                message: "Lifecycle update request is invalid"
              }
            },
            { status: 400 }
          );
        }

        const [, namespace, name] = agentLifecycleMatch;

        try {
          const result = await repository.updateAgentLifecycle(
            namespace,
            name,
            lifecycleStatus,
            actor
          );
          return json({ agent: result });
        } catch (error) {
          if (error instanceof Error && error.message === "agent_not_found") {
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

          if (error instanceof Error && error.message === "forbidden_namespace") {
            return json(
              {
                error: {
                  code: "forbidden_namespace",
                  message: "You do not have access to this namespace"
                }
              },
              { status: 403 }
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
  const authGateway = createAuthGateway(env ?? {});
  return {
    async fetch(request): Promise<Response> {
      const { createRepository } = await import("./create-repository.js");
      const repository = createRepository(env);
      const app = createApp(repository, authGateway);
      return app.fetch(request);
    }
  };
}
