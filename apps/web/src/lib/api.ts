import type {
  AgentDetailResponse,
  AgentListResponse,
  AgentVersionDetailResponse,
  ApiErrorResponse,
  ArtifactListResponse,
  ArtifactPreviewResponse,
  GithubImportCreateResponse,
  GithubImportRequest,
  ImportDraftResponse,
  ImportPublishResponse,
  PublishRequest,
  PublishResponse,
  AgentVersionCompatibilityUpdateRequest,
  AgentVersionCompatibilityUpdateResponse,
  SessionResponse,
  AgentLifecycleUpdateResponse,
  AccountSummaryResponse
  ,
  AccountProfileUpdateRequest,
  RegistryHighlightsResponse,
  AgentMetricsResponse
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

export function buildPublishUrl(): string {
  return "/api/v1/publish";
}

export function buildSessionUrl(): string {
  return "/api/v1/session";
}

export function buildAccountUrl(): string {
  return "/api/v1/account";
}

export function buildAuthStartUrl(
  provider: "github" | "google",
  redirectTo: string
): string {
  return `/api/v1/auth/${provider}/start?redirectTo=${encodeURIComponent(redirectTo)}`;
}

export function buildLogoutUrl(): string {
  return "/api/v1/auth/logout";
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

export function buildTrackedArtifactDownloadUrl(
  namespace: string,
  name: string,
  version: string,
  path: string
): string {
  return `${buildArtifactDownloadUrl(namespace, name, version, path)}?tracked=1`;
}

export function buildArtifactPreviewUrl(
  namespace: string,
  name: string,
  version: string,
  path: string
): string {
  return `${buildArtifactDownloadUrl(namespace, name, version, path)}/content`;
}

export function buildVersionBundleDownloadUrl(
  namespace: string,
  name: string,
  version: string
): string {
  return `${buildAgentVersionUrl(namespace, name, version)}/download.zip`;
}

export function buildVersionCompatibilityUrl(
  namespace: string,
  name: string,
  version: string
): string {
  return buildAgentVersionUrl(namespace, name, version);
}

export function buildTrackedVersionBundleDownloadUrl(
  namespace: string,
  name: string,
  version: string
): string {
  return `${buildVersionBundleDownloadUrl(namespace, name, version)}?tracked=1`;
}

export function buildAgentLifecycleUrl(namespace: string, name: string): string {
  return buildAgentDetailUrl(namespace, name);
}

export function buildHighlightsUrl(): string {
  return "/api/v1/highlights";
}

export function buildAgentMetricActionUrl(
  namespace: string,
  name: string,
  action: "downloads" | "pins" | "stars"
): string {
  return `${buildAgentDetailUrl(namespace, name)}/${action}`;
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

export function fetchSession(): Promise<SessionResponse> {
  return fetchJson<SessionResponse>(buildSessionUrl());
}

export function fetchAccountSummary(): Promise<AccountSummaryResponse> {
  return fetchJson<AccountSummaryResponse>(buildAccountUrl());
}

export function fetchRegistryHighlights(): Promise<RegistryHighlightsResponse> {
  return fetchJson<RegistryHighlightsResponse>(buildHighlightsUrl());
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

export function fetchArtifactPreview(
  namespace: string,
  name: string,
  version: string,
  path: string
): Promise<ArtifactPreviewResponse> {
  return fetchJson<ArtifactPreviewResponse>(buildArtifactPreviewUrl(namespace, name, version, path));
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

export async function publishAgent(payload: PublishRequest): Promise<PublishResponse> {
  const response = await fetch(buildPublishUrl(), {
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

  return (await response.json()) as PublishResponse;
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

export async function updateAgentLifecycle(
  namespace: string,
  name: string,
  lifecycleStatus: "active" | "deprecated" | "unmaintained"
): Promise<AgentLifecycleUpdateResponse> {
  const response = await fetch(buildAgentLifecycleUrl(namespace, name), {
    method: "PATCH",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ lifecycleStatus })
  });

  if (!response.ok) {
    const body = (await response.json()) as ApiErrorResponse;
    throw new Error(body.error.message);
  }

  return (await response.json()) as AgentLifecycleUpdateResponse;
}

export async function updateAccountProfile(
  payload: AccountProfileUpdateRequest
): Promise<AccountSummaryResponse> {
  const response = await fetch(buildAccountUrl(), {
    method: "PATCH",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = (await response.json()) as ApiErrorResponse;
    throw new Error(body.error.message);
  }

  return (await response.json()) as AccountSummaryResponse;
}

export async function updateVersionCompatibility(
  namespace: string,
  name: string,
  version: string,
  payload: AgentVersionCompatibilityUpdateRequest
): Promise<AgentVersionCompatibilityUpdateResponse> {
  const response = await fetch(buildVersionCompatibilityUrl(namespace, name, version), {
    method: "PATCH",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = (await response.json()) as ApiErrorResponse;
    throw new Error(body.error.message);
  }

  return (await response.json()) as AgentVersionCompatibilityUpdateResponse;
}

export async function recordAgentMetric(
  namespace: string,
  name: string,
  action: "downloads" | "pins" | "stars"
): Promise<AgentMetricsResponse> {
  const response = await fetch(buildAgentMetricActionUrl(namespace, name, action), {
    method: "POST"
  });

  if (!response.ok) {
    const body = (await response.json()) as ApiErrorResponse;
    throw new Error(body.error.message);
  }

  return (await response.json()) as AgentMetricsResponse;
}

export async function removeAgentMetric(
  namespace: string,
  name: string,
  action: "pins" | "stars"
): Promise<AgentMetricsResponse> {
  const response = await fetch(buildAgentMetricActionUrl(namespace, name, action), {
    method: "DELETE"
  });

  if (!response.ok) {
    const body = (await response.json()) as ApiErrorResponse;
    throw new Error(body.error.message);
  }

  return (await response.json()) as AgentMetricsResponse;
}

export async function logoutSession(): Promise<void> {
  const response = await fetch(buildLogoutUrl(), {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("Logout failed");
  }
}
