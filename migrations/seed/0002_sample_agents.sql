INSERT INTO agents (id, namespace, name, latest_version, created_at, updated_at) VALUES
  ('agent_raul_code_reviewer', 'raul', 'code-reviewer', '0.2.0', '2026-03-11T00:00:00.000Z', '2026-03-11T10:00:00.000Z'),
  ('agent_acme_support_triager', 'acme', 'support-triager', '0.1.0', '2026-03-11T00:00:00.000Z', '2026-03-11T09:00:00.000Z');

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
