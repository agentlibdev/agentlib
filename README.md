# agentlib

Cloudflare-first public registry for portable AI agents.

## Current scope

This worktree bootstraps the first registry slice:

- TypeScript monorepo skeleton
- Cloudflare Worker entrypoint
- `GET /health`
- explicit JSON 404 response
- `GET /api/v1/agents`
- `GET /api/v1/agents/:namespace/:name`
- `GET /api/v1/agents/:namespace/:name/versions`
- `GET /api/v1/agents/:namespace/:name/versions/:version`
- `GET /api/v1/agents/:namespace/:name/versions/:version/artifacts`
- `GET /api/v1/agents/:namespace/:name/versions/:version/artifacts/:path`
- `POST /api/v1/publish`
- initial D1 migration and provider seed SQL

More storage and publish behavior will land in later steps once the public contracts are settled.

## Recap

Completed so far:

- Phase 2: monorepo skeleton, Worker entrypoint, health endpoint, read-only agent endpoints, initial D1 schema, provider seed data, and local D1 workflow
- Phase 3: manual/local publish alpha, manifest validation against the local `agent-schema` copy, immutable version rejection, metadata persistence in D1
- Phase 4: artifact listing and download routes, D1 metadata + R2 byte storage split, deterministic R2 key layout, and repository wiring for artifact retrieval
- Phase 5: real SHA-256 artifact digests during publish, shared sample publish payload, and local smoke scripts for publish/list/download against Wrangler dev

Recent implementation sequence in `main`:

- `feat: bootstrap api health endpoint`
- `feat: add registry read models and routes`
- `feat: wire local d1 repository abstraction`
- `feat: add local d1 workflow and sample data`
- `feat: add publish alpha and full read routes`
- `feat: validate publish manifests against schema`
- `feat: persist artifacts and verify local publish`
- `feat: serve artifacts from r2 storage`
- `feat: add local smoke scripts and real artifact hashes`

## Next steps

Recommended next slices:

- package and reuse `agent-schema` directly instead of copying it into `agentlib`
- turn the local smoke flow into a single repeatable command or CI-friendly check
- start Phase 6 boundaries for provider import, beginning with GitHub

## Local requirements

- Node.js `>=20` is required to run `wrangler` locally.
- The current codebase can still be typechecked and unit-tested without `wrangler`.

## Initial persistence shape

The first D1 migration defines:

- `agents`
- `agent_versions`
- `artifacts`
- `providers`
- `source_repositories`

Provider seed data currently includes:

- `manual`
- `github`
- `gitlab`
- `bitbucket`

The current API behavior supports two repository modes:

- in-memory seed repository for bootstrap and pure route tests
- D1 + R2 backed repository implementation for local schema/query wiring

Artifact metadata lives in D1 and artifact bytes live in R2.

R2 object keys follow this layout:

```text
agents/<namespace>/<name>/<version>/<path>
```

## Local D1 workflow

Use the local scripts from the repo root:

```bash
npm run d1:reset:local
npm run d1:list:local
```

This creates a local D1 state directory, applies the initial schema, seeds providers, and inserts sample agent/version records for local development.

To exercise the HTTP publish path against local D1:

```bash
npm run dev:api:local
npm run publish:sample:local
npm run list:artifacts:local -- raul code-reviewer 0.3.0
npm run download:artifact:local -- raul code-reviewer 0.3.0 README.md
npm run d1:list:local
npm run d1:list:artifacts:local
```

After publishing, you can fetch artifact metadata and contents through:

```text
GET /api/v1/agents/:namespace/:name/versions/:version/artifacts
GET /api/v1/agents/:namespace/:name/versions/:version/artifacts/:path
```

## Publish alpha

The current alpha publish route accepts JSON with:

- `manifest.metadata.namespace`
- `manifest.metadata.name`
- `manifest.metadata.version`
- `manifest.metadata.title`
- `manifest.metadata.description`
- optional `manifest.metadata.license`
- `readme`
- `artifacts[]`

Current behavior:

- returns `201` for a new version
- returns `409` if `namespace/name@version` already exists
- returns `400` for invalid payloads
- returns `400` if the manifest fails AgentLib schema validation

Artifact metadata is persisted in D1 and artifact bytes are stored in R2. D1 keeps the `r2_key`, media type, size and checksum placeholders; it no longer stores inline artifact payloads.

Artifact checksums are stored as real SHA-256 hex digests during publish.

Manifest validation is enforced in `agentlib` using a local schema copy sourced from `agent-schema`. Keeping those definitions aligned is now an explicit maintenance task until the schema is packaged for direct reuse.
