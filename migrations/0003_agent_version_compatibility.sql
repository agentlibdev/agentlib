ALTER TABLE agent_versions ADD COLUMN compatibility_json TEXT NOT NULL DEFAULT '{"targets":[]}';

UPDATE agent_versions
SET compatibility_json = '{
  "targets": [
    { "targetId": "codex", "builtFor": true, "tested": true, "adapterAvailable": true },
    { "targetId": "claude-code", "builtFor": true, "tested": true, "adapterAvailable": true },
    { "targetId": "github-copilot", "builtFor": true, "tested": false, "adapterAvailable": true },
    { "targetId": "openclaw", "builtFor": false, "tested": false, "adapterAvailable": true },
    { "targetId": "crewai", "builtFor": false, "tested": false, "adapterAvailable": true },
    { "targetId": "langchain", "builtFor": false, "tested": false, "adapterAvailable": true }
  ]
}'
WHERE id IN ('agent_version_raul_code_reviewer_0_1_0', 'agent_version_raul_code_reviewer_0_2_0');

UPDATE agent_versions
SET compatibility_json = '{
  "targets": [
    { "targetId": "gemini-cli", "builtFor": true, "tested": true, "adapterAvailable": true },
    { "targetId": "opencode", "builtFor": true, "tested": false, "adapterAvailable": true },
    { "targetId": "github-copilot", "builtFor": false, "tested": false, "adapterAvailable": true },
    { "targetId": "openclaw", "builtFor": false, "tested": false, "adapterAvailable": true }
  ]
}'
WHERE id = 'agent_version_acme_support_triager_0_1_0';
