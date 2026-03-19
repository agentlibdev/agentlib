CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  namespace TEXT NOT NULL,
  name TEXT NOT NULL,
  latest_version TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(namespace, name)
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
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (source_repository_id) REFERENCES source_repositories(id)
);

CREATE VIEW agent_list_view AS
SELECT
  a.namespace,
  a.name,
  a.latest_version,
  av.title AS latest_title,
  av.description AS latest_description
FROM agents a
JOIN agent_versions av
  ON av.agent_id = a.id
 AND av.version = a.latest_version;
