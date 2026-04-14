ALTER TABLE agents
  ADD COLUMN package_kind TEXT NOT NULL DEFAULT 'agent';

DROP VIEW IF EXISTS agent_list_view;

CREATE VIEW agent_list_view AS
SELECT
  a.namespace,
  a.name,
  a.package_kind,
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
