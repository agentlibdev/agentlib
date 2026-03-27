INSERT INTO users (id, handle, display_name, email, avatar_url, created_at, updated_at) VALUES
  ('user_raul', 'raul', 'Raul', 'raul@example.com', NULL, '2026-03-11T00:00:00.000Z', '2026-03-11T10:00:00.000Z'),
  ('user_acme', 'acme', 'Acme Org', 'ops@acme.test', NULL, '2026-03-11T00:00:00.000Z', '2026-03-11T09:00:00.000Z');

INSERT INTO auth_identities (id, user_id, provider, provider_subject, created_at) VALUES
  ('auth_identity_github_raul', 'user_raul', 'github', 'raul-github', '2026-03-11T00:00:00.000Z'),
  ('auth_identity_google_raul', 'user_raul', 'google', 'raul-google', '2026-03-11T00:00:00.000Z'),
  ('auth_identity_github_acme', 'user_acme', 'github', 'acme-github', '2026-03-11T00:00:00.000Z');

INSERT INTO agents (id, namespace, name, owner_user_id, lifecycle_status, latest_version, created_at, updated_at) VALUES
  ('agent_raul_code_reviewer', 'raul', 'code-reviewer', 'user_raul', 'active', '0.2.0', '2026-03-11T00:00:00.000Z', '2026-03-11T10:00:00.000Z'),
  ('agent_acme_support_triager', 'acme', 'support-triager', 'user_acme', 'active', '0.1.0', '2026-03-11T00:00:00.000Z', '2026-03-11T09:00:00.000Z');

INSERT INTO agent_versions (id, agent_id, version, title, description, license, manifest_json, readme_path, published_at) VALUES
  (
    'agent_version_raul_code_reviewer_0_1_0',
    'agent_raul_code_reviewer',
    '0.1.0',
    'Code Reviewer',
    'Reviews pull requests for correctness and maintainability.',
    'MIT',
    '{"metadata":{"namespace":"raul","name":"code-reviewer","version":"0.1.0"}}',
    'README.md',
    '2026-03-10T10:00:00.000Z'
  ),
  (
    'agent_version_raul_code_reviewer_0_2_0',
    'agent_raul_code_reviewer',
    '0.2.0',
    'Code Reviewer',
    'Reviews pull requests for correctness and maintainability.',
    'MIT',
    '{"metadata":{"namespace":"raul","name":"code-reviewer","version":"0.2.0"}}',
    'README.md',
    '2026-03-11T10:00:00.000Z'
  ),
  (
    'agent_version_acme_support_triager_0_1_0',
    'agent_acme_support_triager',
    '0.1.0',
    'Support Triager',
    'Classifies inbound support requests and suggests routing.',
    'Apache-2.0',
    '{"metadata":{"namespace":"acme","name":"support-triager","version":"0.1.0"}}',
    'README.md',
    '2026-03-11T09:00:00.000Z'
  );

INSERT INTO agent_metrics (agent_id, download_count, pin_count, star_count, updated_at) VALUES
  ('agent_raul_code_reviewer', 128, 12, 24, '2026-03-11T10:00:00.000Z'),
  ('agent_acme_support_triager', 63, 8, 14, '2026-03-11T09:00:00.000Z');

INSERT INTO agent_download_events (id, agent_id, user_id, occurred_at) VALUES
  ('download_raul_1', 'agent_raul_code_reviewer', NULL, '2026-03-11T10:00:00.000Z'),
  ('download_acme_1', 'agent_acme_support_triager', NULL, '2026-03-11T09:00:00.000Z');

INSERT INTO agent_pins (id, agent_id, user_id, created_at) VALUES
  ('pin_raul_acme', 'agent_raul_code_reviewer', 'user_acme', '2026-03-11T10:05:00.000Z'),
  ('pin_acme_raul', 'agent_acme_support_triager', 'user_raul', '2026-03-11T09:05:00.000Z');

INSERT INTO agent_stars (id, agent_id, user_id, created_at) VALUES
  ('star_raul_acme', 'agent_raul_code_reviewer', 'user_acme', '2026-03-11T10:07:00.000Z'),
  ('star_acme_raul', 'agent_acme_support_triager', 'user_raul', '2026-03-11T09:07:00.000Z');
