CREATE TABLE users (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  pronouns TEXT,
  company TEXT,
  location TEXT,
  website_url TEXT,
  time_zone_name TEXT,
  display_local_time INTEGER NOT NULL DEFAULT 0,
  status_emoji TEXT,
  status_text TEXT,
  social_links_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE auth_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(provider, provider_subject),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  namespace TEXT NOT NULL,
  name TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'active',
  latest_version TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(namespace, name),
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE TABLE agent_versions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  license TEXT,
  manifest_json TEXT NOT NULL,
  readme_path TEXT,
  published_at TEXT NOT NULL,
  UNIQUE(agent_id, version),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  agent_version_id TEXT NOT NULL,
  path TEXT NOT NULL,
  media_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  FOREIGN KEY (agent_version_id) REFERENCES agent_versions(id)
);

CREATE TABLE agent_metrics (
  agent_id TEXT PRIMARY KEY,
  download_count INTEGER NOT NULL DEFAULT 0,
  pin_count INTEGER NOT NULL DEFAULT 0,
  star_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE agent_download_events (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  user_id TEXT,
  occurred_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE agent_pins (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(agent_id, user_id),
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE agent_stars (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(agent_id, user_id),
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE providers (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE source_repositories (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  url TEXT NOT NULL,
  owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  UNIQUE(provider_id, external_id),
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

CREATE TABLE import_drafts (
  id TEXT PRIMARY KEY,
  source_repository_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  resolved_ref TEXT NOT NULL,
  manifest_json TEXT NOT NULL,
  readme TEXT NOT NULL,
  artifacts_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (source_repository_id) REFERENCES source_repositories(id)
);

CREATE VIEW agent_list_view AS
SELECT
  a.namespace,
  a.name,
  a.latest_version,
  a.lifecycle_status,
  u.handle AS owner_handle,
  av.title AS latest_title,
  av.description AS latest_description
FROM agents a
JOIN users u
  ON u.id = a.owner_user_id
JOIN agent_versions av
  ON av.agent_id = a.id
 AND av.version = a.latest_version;
