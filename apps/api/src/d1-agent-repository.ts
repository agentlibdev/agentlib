import type {
  AccountProfileUpdateInput,
  AgentCompatibility,
  AgentDetail,
  AgentLifecycleStatus,
  AgentLifecycleUpdateResult,
  AgentMetricResult,
  AccountSummary,
  AgentListItem,
  AgentPackageKind,
  AgentVersionDetail,
  AgentVersionRecord,
  AuthenticatedUser,
  ArtifactContent,
  ArtifactRecord,
  GithubImportRequest,
  GithubImportResult,
  RegistryHighlights,
  PublishRequest,
  PublishResult
} from "@core/agent-record.js";
import {
  createDefaultCompatibility,
  createEmptyCompatibility,
  parseCompatibilityJson
} from "@core/agent-compatibility.js";
import {
  createDefaultAuthority,
  createDefaultProvenance
} from "@core/agent-provenance.js";
import type { AgentRepository } from "@core/agent-repository.js";
import type { GithubClient } from "@providers/github-client.js";
import type { ArtifactStorage } from "@storage/artifact-storage.js";

const LIST_AGENTS_SQL =
  "SELECT namespace, name, package_kind AS packageKind, latest_version AS latestVersion, latest_title AS title, latest_description AS description, lifecycle_status AS lifecycleStatus, owner_handle AS ownerHandle FROM agent_list_view ORDER BY namespace, name LIMIT 50";

const GET_AGENT_DETAIL_SQL =
  "SELECT a.namespace, a.name, a.package_kind AS packageKind, a.latest_version AS latestVersion, a.lifecycle_status AS lifecycleStatus, u.handle AS ownerHandle, a.namespace_type AS namespaceType, a.verification_status AS verificationStatus, a.canonical_namespace AS canonicalNamespace, a.canonical_name AS canonicalName, a.claimed_by_namespace AS claimedByNamespace, a.source_type AS sourceType, a.source_url AS sourceUrl, a.source_repository_url AS sourceRepositoryUrl, a.original_author_handle AS originalAuthorHandle, a.original_author_name AS originalAuthorName, a.original_author_url AS originalAuthorUrl, a.submitted_by_handle AS submittedByHandle, a.submitted_by_name AS submittedByName, u.display_name AS ownerDisplayName, av.version, av.title, av.description, av.published_at AS publishedAt, av.compatibility_json AS compatibilityJson FROM agents a JOIN users u ON u.id = a.owner_user_id JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 ORDER BY av.published_at DESC";

const GET_AGENT_VERSION_DETAIL_SQL =
  "SELECT a.namespace, a.name, a.package_kind AS packageKind, av.version, av.title, av.description, av.license, av.manifest_json AS manifestJson, av.published_at AS publishedAt, a.lifecycle_status AS lifecycleStatus, u.handle AS ownerHandle, a.namespace_type AS namespaceType, a.verification_status AS verificationStatus, a.canonical_namespace AS canonicalNamespace, a.canonical_name AS canonicalName, a.claimed_by_namespace AS claimedByNamespace, a.source_type AS sourceType, a.source_url AS sourceUrl, a.source_repository_url AS sourceRepositoryUrl, a.original_author_handle AS originalAuthorHandle, a.original_author_name AS originalAuthorName, a.original_author_url AS originalAuthorUrl, a.submitted_by_handle AS submittedByHandle, a.submitted_by_name AS submittedByName, u.display_name AS ownerDisplayName, av.compatibility_json AS compatibilityJson FROM agents a JOIN users u ON u.id = a.owner_user_id JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 LIMIT 1";

const CHECK_AGENT_SQL =
  "SELECT id, namespace, name, owner_user_id AS ownerUserId FROM agents WHERE namespace = ?1 AND name = ?2 LIMIT 1";

const GET_USER_BY_IDENTITY_SQL =
  "SELECT user_id AS id FROM auth_identities WHERE provider = ?1 AND provider_subject = ?2 LIMIT 1";

const GET_USER_BY_EMAIL_SQL =
  "SELECT id FROM users WHERE email = ?1 LIMIT 1";

const GET_USER_BY_HANDLE_SQL =
  "SELECT id FROM users WHERE handle = ?1 LIMIT 1";

const INSERT_USER_SQL =
  "INSERT INTO users (id, handle, display_name, email, avatar_url, bio, pronouns, company, location, website_url, time_zone_name, display_local_time, status_emoji, status_text, social_links_json, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '[]', ?6, ?7)";

const INSERT_AUTH_IDENTITY_SQL =
  "INSERT INTO auth_identities (id, user_id, provider, provider_subject, created_at) VALUES (?1, ?2, ?3, ?4, ?5)";

const UPDATE_USER_SQL =
  "UPDATE users SET handle = ?1, display_name = ?2, email = ?3, avatar_url = ?4, updated_at = ?5 WHERE id = ?6";

const CHECK_AGENT_VERSION_SQL =
  "SELECT av.id FROM agents a JOIN agent_versions av ON av.agent_id = a.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 LIMIT 1";

const INSERT_AGENT_SQL =
  "INSERT INTO agents (id, namespace, name, package_kind, owner_user_id, lifecycle_status, latest_version, namespace_type, verification_status, canonical_namespace, canonical_name, claimed_by_namespace, source_type, source_url, source_repository_url, original_author_handle, original_author_name, original_author_url, submitted_by_handle, submitted_by_name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)";

const UPDATE_AGENT_LATEST_SQL =
  "UPDATE agents SET latest_version = ?1, updated_at = ?2 WHERE id = ?3";

const UPDATE_AGENT_LIFECYCLE_SQL =
  "UPDATE agents SET lifecycle_status = ?1, updated_at = ?2 WHERE id = ?3";

const INSERT_AGENT_VERSION_SQL =
  "INSERT INTO agent_versions (id, agent_id, version, title, description, license, manifest_json, readme_path, compatibility_json, published_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)";

const UPDATE_AGENT_VERSION_COMPATIBILITY_SQL =
  "UPDATE agent_versions SET compatibility_json = ?1 WHERE id = ?2";

const INSERT_ARTIFACT_SQL =
  "INSERT INTO artifacts (id, agent_version_id, path, media_type, size_bytes, sha256, r2_key) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)";

const LIST_ARTIFACTS_SQL =
  "SELECT art.path, art.media_type AS mediaType, art.size_bytes AS sizeBytes FROM agents a JOIN agent_versions av ON av.agent_id = a.id JOIN artifacts art ON art.agent_version_id = av.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 ORDER BY art.path";

const GET_ARTIFACT_SQL =
  "SELECT art.path, art.media_type AS mediaType, art.r2_key AS r2Key FROM agents a JOIN agent_versions av ON av.agent_id = a.id JOIN artifacts art ON art.agent_version_id = av.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 AND art.path = ?4 LIMIT 1";

const LIST_ARTIFACT_CONTENTS_SQL =
  "SELECT art.path, art.media_type AS mediaType, art.r2_key AS r2Key FROM agents a JOIN agent_versions av ON av.agent_id = a.id JOIN artifacts art ON art.agent_version_id = av.id WHERE a.namespace = ?1 AND a.name = ?2 AND av.version = ?3 ORDER BY art.path";

const GET_PROVIDER_SQL = "SELECT id FROM providers WHERE slug = ?1 LIMIT 1";

const CHECK_SOURCE_REPOSITORY_SQL =
  "SELECT id FROM source_repositories WHERE provider_id = ?1 AND external_id = ?2 LIMIT 1";

const INSERT_SOURCE_REPOSITORY_SQL =
  "INSERT INTO source_repositories (id, provider_id, external_id, url, owner, repo_name) VALUES (?1, ?2, ?3, ?4, ?5, ?6)";

const UPDATE_SOURCE_REPOSITORY_SQL =
  "UPDATE source_repositories SET url = ?1, owner = ?2, repo_name = ?3 WHERE id = ?4";

const INSERT_IMPORT_DRAFT_SQL =
  "INSERT INTO import_drafts (id, source_repository_id, provider, status, resolved_ref, manifest_json, readme, artifacts_json, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)";

const GET_IMPORT_DRAFT_SQL =
  "SELECT d.id, d.status, d.provider, d.resolved_ref AS resolvedRef, d.manifest_json AS manifestJson, d.readme, d.artifacts_json AS artifactsJson, d.source_repository_id AS sourceRepositoryId, sr.external_id AS externalId, sr.url, sr.owner, sr.repo_name AS repoName FROM import_drafts d JOIN source_repositories sr ON sr.id = d.source_repository_id WHERE d.id = ?1 LIMIT 1";

const UPDATE_IMPORT_DRAFT_STATUS_SQL =
  "UPDATE import_drafts SET status = ?1, updated_at = ?2 WHERE id = ?3";

const GET_ACCOUNT_USER_SQL =
  "SELECT id, handle, display_name AS displayName, email, avatar_url AS avatarUrl, bio, pronouns, company, location, website_url AS websiteUrl, time_zone_name AS timeZoneName, display_local_time AS displayLocalTime, status_emoji AS statusEmoji, status_text AS statusText, social_links_json AS socialLinksJson FROM users WHERE id = ?1 LIMIT 1";

const UPDATE_ACCOUNT_PROFILE_SQL =
  "UPDATE users SET display_name = ?1, bio = ?2, pronouns = ?3, company = ?4, location = ?5, website_url = ?6, time_zone_name = ?7, display_local_time = ?8, status_emoji = ?9, status_text = ?10, social_links_json = ?11, updated_at = ?12 WHERE id = ?13";

const LIST_ACCOUNT_IDENTITIES_SQL =
  "SELECT ai.provider, u.handle, u.email FROM auth_identities ai JOIN users u ON u.id = ai.user_id WHERE ai.user_id = ?1 ORDER BY ai.provider";

const LIST_OWNED_AGENTS_SQL =
  "SELECT a.namespace, a.name, a.latest_version AS latestVersion, av.title, av.description, a.lifecycle_status AS lifecycleStatus, u.handle AS ownerHandle FROM agents a JOIN users u ON u.id = a.owner_user_id JOIN agent_versions av ON av.agent_id = a.id AND av.version = a.latest_version WHERE a.owner_user_id = ?1 ORDER BY a.namespace, a.name LIMIT 100";

const INSERT_AGENT_METRICS_SQL =
  "INSERT INTO agent_metrics (agent_id, download_count, pin_count, star_count, updated_at) VALUES (?1, 0, 0, 0, ?2)";

const GET_AGENT_METRICS_SQL =
  "SELECT download_count AS downloadCount, pin_count AS pinCount, star_count AS starCount FROM agent_metrics WHERE agent_id = ?1 LIMIT 1";

const INSERT_DOWNLOAD_EVENT_SQL =
  "INSERT INTO agent_download_events (id, agent_id, user_id, occurred_at) VALUES (?1, ?2, NULL, ?3)";

const INCREMENT_DOWNLOAD_COUNT_SQL =
  "UPDATE agent_metrics SET download_count = download_count + 1, updated_at = ?1 WHERE agent_id = ?2";

const CHECK_AGENT_PIN_SQL =
  "SELECT id FROM agent_pins WHERE agent_id = ?1 AND user_id = ?2 LIMIT 1";

const INSERT_AGENT_PIN_SQL =
  "INSERT INTO agent_pins (id, agent_id, user_id, created_at) VALUES (?1, ?2, ?3, ?4)";

const INCREMENT_PIN_COUNT_SQL =
  "UPDATE agent_metrics SET pin_count = pin_count + 1, updated_at = ?1 WHERE agent_id = ?2";

const DELETE_AGENT_PIN_SQL =
  "DELETE FROM agent_pins WHERE agent_id = ?1 AND user_id = ?2";

const DECREMENT_PIN_COUNT_SQL =
  "UPDATE agent_metrics SET pin_count = CASE WHEN pin_count > 0 THEN pin_count - 1 ELSE 0 END, updated_at = ?1 WHERE agent_id = ?2";

const CHECK_AGENT_STAR_SQL =
  "SELECT id FROM agent_stars WHERE agent_id = ?1 AND user_id = ?2 LIMIT 1";

const INSERT_AGENT_STAR_SQL =
  "INSERT INTO agent_stars (id, agent_id, user_id, created_at) VALUES (?1, ?2, ?3, ?4)";

const INCREMENT_STAR_COUNT_SQL =
  "UPDATE agent_metrics SET star_count = star_count + 1, updated_at = ?1 WHERE agent_id = ?2";

const DELETE_AGENT_STAR_SQL =
  "DELETE FROM agent_stars WHERE agent_id = ?1 AND user_id = ?2";

const DECREMENT_STAR_COUNT_SQL =
  "UPDATE agent_metrics SET star_count = CASE WHEN star_count > 0 THEN star_count - 1 ELSE 0 END, updated_at = ?1 WHERE agent_id = ?2";

const GET_REGISTRY_TOTALS_SQL =
  "SELECT COUNT(*) AS totalAgents, COALESCE(SUM(download_count), 0) AS totalDownloads, COALESCE(SUM(pin_count), 0) AS totalPins, COALESCE(SUM(star_count), 0) AS totalStars FROM agents a LEFT JOIN agent_metrics m ON m.agent_id = a.id";

const LIST_TOP_AGENTS_SQL =
  "SELECT a.namespace, a.name, a.latest_version AS latestVersion, av.title, av.description, a.lifecycle_status AS lifecycleStatus, u.handle AS ownerHandle, COALESCE(m.download_count, 0) AS downloadCount, COALESCE(m.pin_count, 0) AS pinCount, COALESCE(m.star_count, 0) AS starCount FROM agents a JOIN users u ON u.id = a.owner_user_id JOIN agent_versions av ON av.agent_id = a.id AND av.version = a.latest_version LEFT JOIN agent_metrics m ON m.agent_id = a.id ORDER BY (COALESCE(m.download_count, 0) * 3) + (COALESCE(m.star_count, 0) * 2) + COALESCE(m.pin_count, 0) DESC, a.updated_at DESC LIMIT 6";

type AgentListRow = AgentListItem;

type AgentDetailRow = {
  namespace: string;
  name: string;
  packageKind: AgentPackageKind | null;
  latestVersion: string;
  lifecycleStatus: AgentLifecycleStatus;
  ownerHandle: string;
  ownerDisplayName: string | null;
  namespaceType: "official" | "community" | "mirror" | null;
  verificationStatus: "unofficial" | "verified_mirror" | "claimed_by_upstream" | "official" | null;
  canonicalNamespace: string | null;
  canonicalName: string | null;
  claimedByNamespace: string | null;
  sourceType: "manual" | "github" | "gitlab" | "bitbucket" | "upload" | null;
  sourceUrl: string | null;
  sourceRepositoryUrl: string | null;
  originalAuthorHandle: string | null;
  originalAuthorName: string | null;
  originalAuthorUrl: string | null;
  submittedByHandle: string | null;
  submittedByName: string | null;
  version: string;
  title: string;
  description: string;
  publishedAt: string;
  compatibilityJson: string | null;
};

type AgentVersionDetailRow = {
  namespace: string;
  name: string;
  packageKind: AgentPackageKind | null;
  version: string;
  title: string;
  description: string;
  license: string | null;
  manifestJson: string;
  publishedAt: string;
  lifecycleStatus: AgentLifecycleStatus;
  ownerHandle: string;
  ownerDisplayName: string | null;
  namespaceType: "official" | "community" | "mirror" | null;
  verificationStatus: "unofficial" | "verified_mirror" | "claimed_by_upstream" | "official" | null;
  canonicalNamespace: string | null;
  canonicalName: string | null;
  claimedByNamespace: string | null;
  sourceType: "manual" | "github" | "gitlab" | "bitbucket" | "upload" | null;
  sourceUrl: string | null;
  sourceRepositoryUrl: string | null;
  originalAuthorHandle: string | null;
  originalAuthorName: string | null;
  originalAuthorUrl: string | null;
  submittedByHandle: string | null;
  submittedByName: string | null;
  compatibilityJson: string | null;
};

type AgentRow = {
  id: string;
  namespace: string;
  name: string;
  ownerUserId: string;
};

type ArtifactRow = ArtifactRecord;

type ArtifactLookupRow = {
  path: string;
  mediaType: string;
  r2Key: string;
};

type ProviderRow = {
  id: string;
};

type SourceRepositoryRow = {
  id: string;
};

type ImportDraftRow = {
  id: string;
  status: "draft" | "published";
  provider: "github";
  resolvedRef: string;
  manifestJson: string;
  readme: string;
  artifactsJson: string;
  sourceRepositoryId: string;
  externalId: string;
  url: string;
  owner: string;
  repoName: string;
};

type AccountUserRow = {
  id: string;
  handle: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  bio: string | null;
  pronouns: string | null;
  company: string | null;
  location: string | null;
  websiteUrl: string | null;
  timeZoneName: string | null;
  displayLocalTime: number;
  statusEmoji: string | null;
  statusText: string | null;
  socialLinksJson: string;
};

type AccountIdentityRow = {
  provider: "github" | "google";
  handle: string;
  email: string | null;
};

type AgentMetricsRow = {
  downloadCount: number;
  pinCount: number;
  starCount: number;
};

type RegistryTotalsRow = {
  totalAgents: number;
  totalDownloads: number;
  totalPins: number;
  totalStars: number;
};

function createId(prefix: string, parts: string[]): string {
  return [prefix, ...parts].join("_").replace(/[^a-zA-Z0-9_]/g, "_");
}

function getBase64ByteLength(content: string): number {
  const normalized = content.replace(/\s+/g, "");
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return (normalized.length * 3) / 4 - padding;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function createArtifactMetadata(content: string) {
  const sizeBytes = getBase64ByteLength(content);
  const bytes = decodeBase64Bytes(content);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return {
    sizeBytes,
    sha256: toHex(digest)
  };
}

function buildArtifactKey(namespace: string, name: string, version: string, path: string): string {
  return `agents/${namespace}/${name}/${version}/${path}`;
}

function decodeBase64Bytes(content: string): ArrayBuffer {
  return Uint8Array.from(atob(content), (char) => char.charCodeAt(0)).buffer;
}

async function upsertAuthenticatedUser(
  db: D1Database,
  actor: AuthenticatedUser
): Promise<string> {
  const now = new Date().toISOString();
  const existingIdentity = await db
    .prepare(GET_USER_BY_IDENTITY_SQL)
    .bind(actor.provider, actor.subject)
    .all<{ id: string }>();

  const linkedByEmail =
    !existingIdentity.results[0] && actor.email
      ? await db.prepare(GET_USER_BY_EMAIL_SQL).bind(actor.email).all<{ id: string }>()
      : { results: [] };

  const linkedByHandle =
    !existingIdentity.results[0] && !linkedByEmail.results[0]
      ? await db.prepare(GET_USER_BY_HANDLE_SQL).bind(actor.handle).all<{ id: string }>()
      : { results: [] };

  const userId =
    existingIdentity.results[0]?.id ??
    linkedByEmail.results[0]?.id ??
    linkedByHandle.results[0]?.id ??
    createId("user", [actor.email ?? actor.provider, actor.subject]);

  if (!existingIdentity.results[0] && !linkedByEmail.results[0] && !linkedByHandle.results[0]) {
    await db
      .prepare(INSERT_USER_SQL)
      .bind(
        userId,
        actor.handle,
        actor.displayName,
        actor.email ?? null,
        actor.avatarUrl ?? null,
        now,
        now
      )
      .run();
  }

  if (!existingIdentity.results[0]) {
    await db
      .prepare(INSERT_AUTH_IDENTITY_SQL)
      .bind(
        createId("auth_identity", [actor.provider, actor.subject]),
        userId,
        actor.provider,
        actor.subject,
        now
      )
      .run();
  }

  if (existingIdentity.results[0] || linkedByEmail.results[0] || linkedByHandle.results[0]) {
    await db
      .prepare(UPDATE_USER_SQL)
      .bind(
        actor.handle,
        actor.displayName,
        actor.email ?? null,
        actor.avatarUrl ?? null,
        now,
        userId
      )
      .run();
  }

  return userId;
}

function toDraftId(externalId: string, resolvedRef: string): string {
  return createId("import_draft_github", [externalId, resolvedRef]);
}

function normalizeProfileText(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

async function getMetricsForAgentId(db: D1Database, agentId: string): Promise<AgentMetricsRow> {
  const result = await db.prepare(GET_AGENT_METRICS_SQL).bind(agentId).all<AgentMetricsRow>();
  return result.results[0] ?? {
    downloadCount: 0,
    pinCount: 0,
    starCount: 0
  };
}

function mapImportDraftRow(row: ImportDraftRow): GithubImportResult {
  const manifest = JSON.parse(row.manifestJson) as {
    metadata: {
      namespace: string;
      name: string;
      version: string;
      title: string;
      description: string;
    };
  };
  const artifacts = JSON.parse(row.artifactsJson) as Array<{
    path: string;
    mediaType: string;
    content: string;
  }>;

  return {
    id: row.id,
    status: row.status,
    provider: row.provider,
    repository: {
      externalId: row.externalId,
      url: row.url,
      owner: row.owner,
      name: row.repoName,
      defaultBranch: row.resolvedRef,
      resolvedRef: row.resolvedRef
    },
    manifest: {
      namespace: manifest.metadata.namespace,
      name: manifest.metadata.name,
      version: manifest.metadata.version,
      title: manifest.metadata.title,
      description: manifest.metadata.description
    },
    readme: row.readme,
    artifacts: artifacts.map((artifact) => ({
      path: artifact.path,
      mediaType: artifact.mediaType,
      sizeBytes: getBase64ByteLength(artifact.content)
    })),
    sourceRepositoryId: row.sourceRepositoryId
  };
}

export class D1AgentRepository implements AgentRepository {
  constructor(
    private readonly db: D1Database,
    private readonly storage: ArtifactStorage,
    private readonly githubClient: GithubClient = {
      async getRepository() {
        throw new Error("github_upstream_error");
      },
      async getManifest() {
        throw new Error("github_upstream_error");
      },
      async getPackageFiles() {
        throw new Error("github_upstream_error");
      }
    }
  ) {}

  async listAgents() {
    const result = await this.db.prepare(LIST_AGENTS_SQL).all<AgentListRow>();
    const items = await Promise.all(
      result.results.map(async (item) => {
        const agentResult = await this.db
          .prepare(CHECK_AGENT_SQL)
          .bind(item.namespace, item.name)
          .all<AgentRow>();
        const metrics = agentResult.results[0]
          ? await getMetricsForAgentId(this.db, agentResult.results[0].id)
          : { downloadCount: 0, pinCount: 0, starCount: 0 };

        return {
          ...item,
          ...metrics
        };
      })
    );

    return {
      items,
      nextCursor: null
    };
  }

  async getRegistryHighlights(): Promise<RegistryHighlights> {
    const totalsResult = await this.db.prepare(GET_REGISTRY_TOTALS_SQL).all<RegistryTotalsRow>();
    const topAgentsResult = await this.db.prepare(LIST_TOP_AGENTS_SQL).all<AgentListItem>();

    return {
      stats: totalsResult.results[0] ?? {
        totalAgents: 0,
        totalDownloads: 0,
        totalPins: 0,
        totalStars: 0
      },
      topAgents: topAgentsResult.results
    };
  }

  async getAccountSummary(actor: AuthenticatedUser): Promise<AccountSummary> {
    const userId = await upsertAuthenticatedUser(this.db, actor);
    const userResult = await this.db.prepare(GET_ACCOUNT_USER_SQL).bind(userId).all<AccountUserRow>();
    const identitiesResult = await this.db
      .prepare(LIST_ACCOUNT_IDENTITIES_SQL)
      .bind(userId)
      .all<AccountIdentityRow>();
    const agentsResult = await this.db
      .prepare(LIST_OWNED_AGENTS_SQL)
      .bind(userId)
      .all<AgentListRow>();

    const user = userResult.results[0];
    const ownedAgents = await Promise.all(
      agentsResult.results.map(async (item) => {
        const agentResult = await this.db
          .prepare(CHECK_AGENT_SQL)
          .bind(item.namespace, item.name)
          .all<AgentRow>();
        const metrics = agentResult.results[0]
          ? await getMetricsForAgentId(this.db, agentResult.results[0].id)
          : { downloadCount: 0, pinCount: 0, starCount: 0 };

        return {
          ...item,
          ...metrics
        };
      })
    );
    const topAgent =
      [...ownedAgents].sort((left, right) => {
        const leftScore = left.downloadCount * 3 + left.starCount * 2 + left.pinCount;
        const rightScore = right.downloadCount * 3 + right.starCount * 2 + right.pinCount;
        return rightScore - leftScore;
      })[0] ?? null;

    return {
      user: {
        handle: user?.handle ?? actor.handle,
        displayName: user?.displayName ?? actor.displayName,
        ...(user?.email ? { email: user.email } : {}),
        ...(user?.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
        ...(user?.bio ? { bio: user.bio } : {}),
        ...(user?.pronouns ? { pronouns: user.pronouns } : {}),
        ...(user?.company ? { company: user.company } : {}),
        ...(user?.location ? { location: user.location } : {}),
        ...(user?.websiteUrl ? { websiteUrl: user.websiteUrl } : {}),
        ...(user?.timeZoneName ? { timeZoneName: user.timeZoneName } : {}),
        displayLocalTime: Boolean(user?.displayLocalTime),
        ...(user?.statusEmoji ? { statusEmoji: user.statusEmoji } : {}),
        ...(user?.statusText ? { statusText: user.statusText } : {}),
        socialLinks: user?.socialLinksJson ? JSON.parse(user.socialLinksJson) : []
      },
      identities: identitiesResult.results.map((identity) => ({
        provider: identity.provider,
        handle: identity.handle,
        ...(identity.email ? { email: identity.email } : {})
      })),
      ownedAgents,
      stats: {
        ownedAgentCount: ownedAgents.length,
        totalDownloads: ownedAgents.reduce((sum, item) => sum + item.downloadCount, 0),
        totalPins: ownedAgents.reduce((sum, item) => sum + item.pinCount, 0),
        totalStars: ownedAgents.reduce((sum, item) => sum + item.starCount, 0)
      },
      topAgent
    };
  }

  async updateAccountProfile(
    profile: AccountProfileUpdateInput,
    actor: AuthenticatedUser
  ): Promise<AccountSummary> {
    const userId = await upsertAuthenticatedUser(this.db, actor);
    const now = new Date().toISOString();

    await this.db
      .prepare(UPDATE_ACCOUNT_PROFILE_SQL)
      .bind(
        profile.displayName.trim(),
        normalizeProfileText(profile.bio),
        normalizeProfileText(profile.pronouns),
        normalizeProfileText(profile.company),
        normalizeProfileText(profile.location),
        normalizeProfileText(profile.websiteUrl),
        normalizeProfileText(profile.timeZoneName),
        profile.displayLocalTime ? 1 : 0,
        normalizeProfileText(profile.statusEmoji),
        normalizeProfileText(profile.statusText),
        JSON.stringify(profile.socialLinks),
        now,
        userId
      )
      .run();

    return this.getAccountSummary(actor);
  }

  async getAgentDetail(
    namespace: string,
    name: string,
    actor?: AuthenticatedUser | null
  ): Promise<AgentDetail | null> {
    const result = await this.db
      .prepare(GET_AGENT_DETAIL_SQL)
      .bind(namespace, name)
      .all<AgentDetailRow>();

    if (result.results.length === 0) {
      return null;
    }

    const [firstRow] = result.results;
    const versions: AgentVersionRecord[] = result.results.map((row) => ({
      version: row.version,
      title: row.title,
      description: row.description,
      publishedAt: row.publishedAt
    }));
    const agentResult = await this.db
      .prepare(CHECK_AGENT_SQL)
      .bind(namespace, name)
      .all<AgentRow>();
    const agentRow = agentResult.results[0];
    const metrics = agentRow
      ? await getMetricsForAgentId(this.db, agentRow.id)
      : { downloadCount: 0, pinCount: 0, starCount: 0 };
    const viewerUserId = actor ? await upsertAuthenticatedUser(this.db, actor) : null;
    const hasPinned =
      agentRow && viewerUserId
        ? Boolean(
            (
              await this.db
                .prepare(CHECK_AGENT_PIN_SQL)
                .bind(agentRow.id, viewerUserId)
                .all<{ id: string }>()
            ).results[0]
          )
        : false;
    const hasStarred =
      agentRow && viewerUserId
        ? Boolean(
            (
              await this.db
                .prepare(CHECK_AGENT_STAR_SQL)
                .bind(agentRow.id, viewerUserId)
                .all<{ id: string }>()
            ).results[0]
          )
        : false;

    return {
      namespace: firstRow.namespace,
      name: firstRow.name,
      packageKind: firstRow.packageKind ?? "agent",
      latestVersion: firstRow.latestVersion,
      lifecycleStatus: firstRow.lifecycleStatus,
      ownerHandle: firstRow.ownerHandle,
      authority: createDefaultAuthority({
        namespace: firstRow.canonicalNamespace ?? firstRow.namespace,
        name: firstRow.canonicalName ?? firstRow.name,
        namespaceType: firstRow.namespaceType ?? "official",
        verificationStatus: firstRow.verificationStatus ?? "official",
        claimedByNamespace: firstRow.claimedByNamespace
      }),
      provenance: createDefaultProvenance({
        ownerHandle: firstRow.ownerHandle,
        ownerDisplayName: firstRow.ownerDisplayName,
        sourceType: firstRow.sourceType ?? "manual",
        sourceUrl: firstRow.sourceUrl,
        sourceRepositoryUrl: firstRow.sourceRepositoryUrl,
        originalAuthorHandle: firstRow.originalAuthorHandle,
        originalAuthorName: firstRow.originalAuthorName,
        originalAuthorUrl: firstRow.originalAuthorUrl,
        submittedByHandle: firstRow.submittedByHandle,
        submittedByName: firstRow.submittedByName
      }),
      compatibility: parseCompatibilityJson(
        firstRow.compatibilityJson,
        createDefaultCompatibility({
          namespace: firstRow.namespace,
          name: firstRow.name
        })
      ),
      ...metrics,
      viewer: {
        hasPinned,
        hasStarred
      },
      versions
    };
  }

  async listAgentVersions(namespace: string, name: string): Promise<AgentVersionRecord[] | null> {
    const detail = await this.getAgentDetail(namespace, name);
    return detail ? detail.versions : null;
  }

  async getAgentVersionDetail(
    namespace: string,
    name: string,
    version: string
  ): Promise<AgentVersionDetail | null> {
    const result = await this.db
      .prepare(GET_AGENT_VERSION_DETAIL_SQL)
      .bind(namespace, name, version)
      .all<AgentVersionDetailRow>();

    const row = result.results[0];
    if (!row) {
      return null;
    }

    return {
      namespace: row.namespace,
      name: row.name,
      packageKind: row.packageKind ?? "agent",
      version: row.version,
      title: row.title,
      description: row.description,
      license: row.license,
      manifestJson: row.manifestJson,
      publishedAt: row.publishedAt,
      lifecycleStatus: row.lifecycleStatus,
      ownerHandle: row.ownerHandle,
      authority: createDefaultAuthority({
        namespace: row.canonicalNamespace ?? row.namespace,
        name: row.canonicalName ?? row.name,
        namespaceType: row.namespaceType ?? "official",
        verificationStatus: row.verificationStatus ?? "official",
        claimedByNamespace: row.claimedByNamespace
      }),
      provenance: createDefaultProvenance({
        ownerHandle: row.ownerHandle,
        ownerDisplayName: row.ownerDisplayName,
        sourceType: row.sourceType ?? "manual",
        sourceUrl: row.sourceUrl,
        sourceRepositoryUrl: row.sourceRepositoryUrl,
        originalAuthorHandle: row.originalAuthorHandle,
        originalAuthorName: row.originalAuthorName,
        originalAuthorUrl: row.originalAuthorUrl,
        submittedByHandle: row.submittedByHandle,
        submittedByName: row.submittedByName
      }),
      compatibility: parseCompatibilityJson(
        row.compatibilityJson,
        createDefaultCompatibility({
          namespace: row.namespace,
          name: row.name
        })
      )
    };
  }

  async listArtifacts(
    namespace: string,
    name: string,
    version: string
  ): Promise<ArtifactRecord[] | null> {
    const result = await this.db
      .prepare(LIST_ARTIFACTS_SQL)
      .bind(namespace, name, version)
      .all<ArtifactRow>();

    return result.results.length > 0 ? result.results : null;
  }

  async getArtifactContent(
    namespace: string,
    name: string,
    version: string,
    path: string
  ): Promise<ArtifactContent | null> {
    const result = await this.db
      .prepare(GET_ARTIFACT_SQL)
      .bind(namespace, name, version, path)
      .all<ArtifactLookupRow>();

    const row = result.results[0];
    if (!row) {
      return null;
    }

    const artifact = await this.storage.getArtifact(row.r2Key);
    if (!artifact) {
      return null;
    }

    return {
      path: row.path,
      mediaType: row.mediaType,
      content: artifact.content
    };
  }

  async listArtifactContents(
    namespace: string,
    name: string,
    version: string
  ): Promise<ArtifactContent[] | null> {
    const result = await this.db
      .prepare(LIST_ARTIFACT_CONTENTS_SQL)
      .bind(namespace, name, version)
      .all<ArtifactLookupRow>();

    if (result.results.length === 0) {
      return null;
    }

    const artifacts = await Promise.all(
      result.results.map(async (row) => {
        const artifact = await this.storage.getArtifact(row.r2Key);
        if (!artifact) {
          return null;
        }

        return {
          path: row.path,
          mediaType: row.mediaType,
          content: artifact.content
        };
      })
    );

    return artifacts.filter((artifact): artifact is ArtifactContent => artifact !== null);
  }

  async publishAgentVersion(
    payload: PublishRequest,
    actor: AuthenticatedUser
  ): Promise<PublishResult> {
    const metadata = payload.manifest.metadata;
    const now = new Date().toISOString();
    const userId = await upsertAuthenticatedUser(this.db, actor);
    const authority = createDefaultAuthority({
      namespace: metadata.namespace,
      name: metadata.name
    });
    const provenance = createDefaultProvenance({
      ownerHandle: actor.handle,
      ownerDisplayName: actor.displayName
    });

    const existingVersion = await this.db
      .prepare(CHECK_AGENT_VERSION_SQL)
      .bind(metadata.namespace, metadata.name, metadata.version)
      .all<{ id: string }>();

    if (existingVersion.results.length > 0) {
      throw new Error("version_exists");
    }

    const existingAgent = await this.db
      .prepare(CHECK_AGENT_SQL)
      .bind(metadata.namespace, metadata.name)
      .all<AgentRow>();

    if (existingAgent.results[0]) {
      if (existingAgent.results[0].ownerUserId !== userId) {
        throw new Error("forbidden_namespace");
      }
    } else if (metadata.namespace !== actor.handle) {
      throw new Error("forbidden_namespace");
    }

    const agentId =
      existingAgent.results[0]?.id ??
      createId("agent", [metadata.namespace, metadata.name]);

    if (existingAgent.results.length === 0) {
      await this.db
        .prepare(INSERT_AGENT_SQL)
        .bind(
          agentId,
          metadata.namespace,
          metadata.name,
          payload.packageKind ?? "agent",
          userId,
          "active",
          metadata.version,
          authority.namespaceType,
          authority.verificationStatus,
          authority.canonicalNamespace,
          authority.canonicalName,
          authority.claimedByNamespace,
          provenance.sourceType,
          provenance.sourceUrl,
          provenance.sourceRepositoryUrl,
          provenance.originalAuthorHandle,
          provenance.originalAuthorName,
          provenance.originalAuthorUrl,
          provenance.submittedByHandle,
          provenance.submittedByName,
          now,
          now
        )
        .run();
      await this.db.prepare(INSERT_AGENT_METRICS_SQL).bind(agentId, now).run();
    } else {
      await this.db.prepare(UPDATE_AGENT_LATEST_SQL).bind(metadata.version, now, agentId).run();
    }

    const versionId = createId("agent_version", [
      metadata.namespace,
      metadata.name,
      metadata.version
    ]);

    await this.db
      .prepare(INSERT_AGENT_VERSION_SQL)
      .bind(
        versionId,
        agentId,
        metadata.version,
        metadata.title,
        metadata.description,
        metadata.license ?? null,
        JSON.stringify(payload.manifest),
        "README.md",
        JSON.stringify(payload.compatibility ?? createEmptyCompatibility()),
        now
      )
      .run();

    for (const artifact of payload.artifacts) {
      const artifactId = createId("artifact", [
        metadata.namespace,
        metadata.name,
        metadata.version,
        artifact.path
      ]);
      const artifactMeta = await createArtifactMetadata(artifact.content);
      const artifactKey = buildArtifactKey(
        metadata.namespace,
        metadata.name,
        metadata.version,
        artifact.path
      );

      await this.storage.putArtifact(
        artifactKey,
        artifact.mediaType,
        decodeBase64Bytes(artifact.content)
      );

      await this.db
        .prepare(INSERT_ARTIFACT_SQL)
        .bind(
          artifactId,
          versionId,
          artifact.path,
          artifact.mediaType,
          artifactMeta.sizeBytes,
          artifactMeta.sha256,
          artifactKey
        )
        .run();
    }

    return {
      namespace: metadata.namespace,
      name: metadata.name,
      version: metadata.version
    };
  }

  async updateAgentVersionCompatibility(
    namespace: string,
    name: string,
    version: string,
    compatibility: AgentCompatibility,
    actor: AuthenticatedUser
  ): Promise<AgentVersionDetail | null> {
    const detail = await this.getAgentVersionDetail(namespace, name, version);
    if (!detail) {
      return null;
    }

    if (detail.ownerHandle !== actor.handle) {
      throw new Error("forbidden_version_update");
    }

    const versionId = createId("agent_version", [namespace, name, version]);
    await this.db
      .prepare(UPDATE_AGENT_VERSION_COMPATIBILITY_SQL)
      .bind(JSON.stringify(compatibility), versionId)
      .run();

    return this.getAgentVersionDetail(namespace, name, version);
  }

  async importGithubRepository(
    payload: GithubImportRequest,
    actor: AuthenticatedUser
  ): Promise<GithubImportResult> {
    const repository = await this.githubClient.getRepository(payload.repositoryUrl);
    const importedManifest = await this.githubClient.getManifest(repository, payload.ref);
    const packageFiles = await this.githubClient.getPackageFiles(repository, payload.ref);
    const metadata = importedManifest.manifest as {
      metadata: {
        namespace: string;
        name: string;
        version: string;
        title: string;
        description: string;
      };
    };

    if (metadata.metadata.namespace !== actor.handle) {
      throw new Error("forbidden_namespace");
    }

    const provider = await this.db.prepare(GET_PROVIDER_SQL).bind("github").all<ProviderRow>();
    const providerId = provider.results[0]?.id;

    if (!providerId) {
      throw new Error("github_upstream_error");
    }

    const existingSourceRepository = await this.db
      .prepare(CHECK_SOURCE_REPOSITORY_SQL)
      .bind(providerId, repository.externalId)
      .all<SourceRepositoryRow>();

    const sourceRepositoryId =
      existingSourceRepository.results[0]?.id ??
      createId("source_repo_github", [repository.externalId]);

    if (existingSourceRepository.results.length === 0) {
      await this.db
        .prepare(INSERT_SOURCE_REPOSITORY_SQL)
        .bind(
          sourceRepositoryId,
          providerId,
          repository.externalId,
          repository.url,
          repository.owner,
          repository.name
        )
        .run();
    } else {
      await this.db
        .prepare(UPDATE_SOURCE_REPOSITORY_SQL)
        .bind(repository.url, repository.owner, repository.name, sourceRepositoryId)
        .run();
    }

    const now = new Date().toISOString();
    const draftId = toDraftId(repository.externalId, importedManifest.resolvedRef);

    await this.db
      .prepare(INSERT_IMPORT_DRAFT_SQL)
      .bind(
        draftId,
        sourceRepositoryId,
        "github",
        "draft",
        importedManifest.resolvedRef,
        JSON.stringify(importedManifest.manifest),
        packageFiles.readme,
        JSON.stringify(packageFiles.artifacts),
        now,
        now
      )
      .run();

    return {
      id: draftId,
      status: "draft",
      provider: "github",
      repository: {
        externalId: repository.externalId,
        url: repository.url,
        owner: repository.owner,
        name: repository.name,
        defaultBranch: repository.defaultBranch,
        resolvedRef: importedManifest.resolvedRef
      },
      manifest: {
        namespace: metadata.metadata.namespace,
        name: metadata.metadata.name,
        version: metadata.metadata.version,
        title: metadata.metadata.title,
        description: metadata.metadata.description
      },
      readme: packageFiles.readme,
      artifacts: packageFiles.artifacts.map((artifact) => ({
        path: artifact.path,
        mediaType: artifact.mediaType,
        sizeBytes: getBase64ByteLength(artifact.content)
      })),
      sourceRepositoryId
    };
  }

  async getImportDraft(id: string): Promise<GithubImportResult | null> {
    const result = await this.db.prepare(GET_IMPORT_DRAFT_SQL).bind(id).all<ImportDraftRow>();
    const row = result.results[0];

    if (!row) {
      return null;
    }

    return mapImportDraftRow(row);
  }

  async publishImportDraft(id: string, actor: AuthenticatedUser): Promise<PublishResult> {
    const draft = await this.getImportDraft(id);

    if (!draft) {
      throw new Error("import_not_found");
    }

    if (draft.status !== "draft") {
      throw new Error("import_not_publishable");
    }

    const result = await this.publishAgentVersion({
      manifest: {
        metadata: {
          namespace: draft.manifest.namespace,
          name: draft.manifest.name,
          version: draft.manifest.version,
          title: draft.manifest.title,
          description: draft.manifest.description
        }
      },
      readme: draft.readme,
      artifacts: JSON.parse(
        (
          await this.db.prepare(GET_IMPORT_DRAFT_SQL).bind(id).all<ImportDraftRow>()
        ).results[0]?.artifactsJson ?? "[]"
      )
    }, actor);

    await this.db
      .prepare(UPDATE_IMPORT_DRAFT_STATUS_SQL)
      .bind("published", new Date().toISOString(), id)
      .run();

    return result;
  }

  async updateAgentLifecycle(
    namespace: string,
    name: string,
    lifecycleStatus: AgentLifecycleStatus,
    actor: AuthenticatedUser
  ): Promise<AgentLifecycleUpdateResult> {
    const userId = await upsertAuthenticatedUser(this.db, actor);
    const existingAgent = await this.db.prepare(CHECK_AGENT_SQL).bind(namespace, name).all<AgentRow>();
    const row = existingAgent.results[0];

    if (!row) {
      throw new Error("agent_not_found");
    }

    if (row.ownerUserId !== userId) {
      throw new Error("forbidden_namespace");
    }

    await this.db
      .prepare(UPDATE_AGENT_LIFECYCLE_SQL)
      .bind(lifecycleStatus, new Date().toISOString(), row.id)
      .run();

    return {
      namespace,
      name,
      lifecycleStatus
    };
  }

  async recordAgentDownload(namespace: string, name: string): Promise<AgentMetricResult> {
    const existingAgent = await this.db.prepare(CHECK_AGENT_SQL).bind(namespace, name).all<AgentRow>();
    const row = existingAgent.results[0];

    if (!row) {
      throw new Error("agent_not_found");
    }

    const now = new Date().toISOString();
    await this.db
      .prepare(INSERT_DOWNLOAD_EVENT_SQL)
      .bind(createId("download", [namespace, name, now]), row.id, now)
      .run();
    await this.db.prepare(INCREMENT_DOWNLOAD_COUNT_SQL).bind(now, row.id).run();

    const metrics = await getMetricsForAgentId(this.db, row.id);
    return {
      namespace,
      name,
      ...metrics
    };
  }

  async addAgentPin(
    namespace: string,
    name: string,
    actor: AuthenticatedUser
  ): Promise<AgentMetricResult> {
    const userId = await upsertAuthenticatedUser(this.db, actor);
    const existingAgent = await this.db.prepare(CHECK_AGENT_SQL).bind(namespace, name).all<AgentRow>();
    const row = existingAgent.results[0];

    if (!row) {
      throw new Error("agent_not_found");
    }

    const existingPin = await this.db
      .prepare(CHECK_AGENT_PIN_SQL)
      .bind(row.id, userId)
      .all<{ id: string }>();

    if (!existingPin.results[0]) {
      const now = new Date().toISOString();
      await this.db
        .prepare(INSERT_AGENT_PIN_SQL)
        .bind(createId("pin", [userId, row.id]), row.id, userId, now)
        .run();
      await this.db.prepare(INCREMENT_PIN_COUNT_SQL).bind(now, row.id).run();
    }

    const metrics = await getMetricsForAgentId(this.db, row.id);
    return {
      namespace,
      name,
      ...metrics
    };
  }

  async addAgentStar(
    namespace: string,
    name: string,
    actor: AuthenticatedUser
  ): Promise<AgentMetricResult> {
    const userId = await upsertAuthenticatedUser(this.db, actor);
    const existingAgent = await this.db.prepare(CHECK_AGENT_SQL).bind(namespace, name).all<AgentRow>();
    const row = existingAgent.results[0];

    if (!row) {
      throw new Error("agent_not_found");
    }

    const existingStar = await this.db
      .prepare(CHECK_AGENT_STAR_SQL)
      .bind(row.id, userId)
      .all<{ id: string }>();

    if (!existingStar.results[0]) {
      const now = new Date().toISOString();
      await this.db
        .prepare(INSERT_AGENT_STAR_SQL)
        .bind(createId("star", [userId, row.id]), row.id, userId, now)
        .run();
      await this.db.prepare(INCREMENT_STAR_COUNT_SQL).bind(now, row.id).run();
    }

    const metrics = await getMetricsForAgentId(this.db, row.id);
    return {
      namespace,
      name,
      ...metrics
    };
  }

  async removeAgentPin(
    namespace: string,
    name: string,
    actor: AuthenticatedUser
  ): Promise<AgentMetricResult> {
    const userId = await upsertAuthenticatedUser(this.db, actor);
    const existingAgent = await this.db.prepare(CHECK_AGENT_SQL).bind(namespace, name).all<AgentRow>();
    const row = existingAgent.results[0];

    if (!row) {
      throw new Error("agent_not_found");
    }

    const existingPin = await this.db
      .prepare(CHECK_AGENT_PIN_SQL)
      .bind(row.id, userId)
      .all<{ id: string }>();

    if (existingPin.results[0]) {
      const now = new Date().toISOString();
      await this.db.prepare(DELETE_AGENT_PIN_SQL).bind(row.id, userId).run();
      await this.db.prepare(DECREMENT_PIN_COUNT_SQL).bind(now, row.id).run();
    }

    const metrics = await getMetricsForAgentId(this.db, row.id);
    return {
      namespace,
      name,
      ...metrics
    };
  }

  async removeAgentStar(
    namespace: string,
    name: string,
    actor: AuthenticatedUser
  ): Promise<AgentMetricResult> {
    const userId = await upsertAuthenticatedUser(this.db, actor);
    const existingAgent = await this.db.prepare(CHECK_AGENT_SQL).bind(namespace, name).all<AgentRow>();
    const row = existingAgent.results[0];

    if (!row) {
      throw new Error("agent_not_found");
    }

    const existingStar = await this.db
      .prepare(CHECK_AGENT_STAR_SQL)
      .bind(row.id, userId)
      .all<{ id: string }>();

    if (existingStar.results[0]) {
      const now = new Date().toISOString();
      await this.db.prepare(DELETE_AGENT_STAR_SQL).bind(row.id, userId).run();
      await this.db.prepare(DECREMENT_STAR_COUNT_SQL).bind(now, row.id).run();
    }

    const metrics = await getMetricsForAgentId(this.db, row.id);
    return {
      namespace,
      name,
      ...metrics
    };
  }
}

export const d1Queries = {
  LIST_AGENTS_SQL,
  GET_AGENT_DETAIL_SQL,
  GET_AGENT_VERSION_DETAIL_SQL,
  INSERT_ARTIFACT_SQL,
  LIST_ARTIFACTS_SQL,
  GET_ARTIFACT_SQL
};
