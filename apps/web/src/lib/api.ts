import type {
  AgentDetailResponse,
  AgentListResponse,
  AgentVersionDetailResponse,
  ApiErrorResponse,
  ArtifactListResponse,
  GithubImportCreateResponse,
  GithubImportRequest,
  ImportDraftResponse,
  ImportPublishResponse
} from "./types.js";

export function buildAgentDetailUrl(namespace: string, name: string): string {
  return `/api/v1/agents/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;
}

export function buildAgentVersionUrl(
  namespace: string,
  name: string,
  version: string
): string {
  return `${buildAgentDetailUrl(namespace, name)}/versions/${encodeURIComponent(version)}`;
}

export function buildArtifactsUrl(
  namespace: string,
  name: string,
  version: string
): string {
  return `${buildAgentVersionUrl(namespace, name, version)}/artifacts`;
}

export function buildGithubImportUrl(): string {
  return "/api/v1/providers/github/import";
}

export function buildImportDetailUrl(importId: string): string {
  return `/api/v1/imports/${encodeURIComponent(importId)}`;
}

export function buildImportPublishUrl(importId: string): string {
  return `${buildImportDetailUrl(importId)}/publish`;
}

export function buildArtifactDownloadUrl(
  namespace: string,
  name: string,
  version: string,
  path: string
): string {
  return `${buildArtifactsUrl(namespace, name, version)}/${encodeURIComponent(path)}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    const body = (await response.json()) as ApiErrorResponse;
    throw new Error(body.error.message);
  }

  return (await response.json()) as T;
}

export function fetchAgents(): Promise<AgentListResponse> {
  return fetchJson<AgentListResponse>("/api/v1/agents");
}

export function fetchAgent(namespace: string, name: string): Promise<AgentDetailResponse> {
  return fetchJson<AgentDetailResponse>(buildAgentDetailUrl(namespace, name));
}

export function fetchAgentVersion(
  namespace: string,
  name: string,
  version: string
): Promise<AgentVersionDetailResponse> {
  return fetchJson<AgentVersionDetailResponse>(
    buildAgentVersionUrl(namespace, name, version)
  );
}

export function fetchArtifacts(
  namespace: string,
  name: string,
  version: string
): Promise<ArtifactListResponse> {
  return fetchJson<ArtifactListResponse>(buildArtifactsUrl(namespace, name, version));
}

export async function createGithubImport(
  payload: GithubImportRequest
): Promise<GithubImportCreateResponse> {
  const response = await fetch(buildGithubImportUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = (await response.json()) as ApiErrorResponse;
    throw new Error(body.error.message);
  }

  return (await response.json()) as GithubImportCreateResponse;
}

export function fetchImportDraft(importId: string): Promise<ImportDraftResponse> {
  return fetchJson<ImportDraftResponse>(buildImportDetailUrl(importId));
}

export async function publishImportDraft(importId: string): Promise<ImportPublishResponse> {
  const response = await fetch(buildImportPublishUrl(importId), {
    method: "POST"
  });

  if (!response.ok) {
    const body = (await response.json()) as ApiErrorResponse;
    throw new Error(body.error.message);
  }

  return (await response.json()) as ImportPublishResponse;
}
