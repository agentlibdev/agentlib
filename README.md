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
- Phase 3: manual/local publish alpha, manifest validation, immutable version rejection, metadata persistence in D1
- Phase 4: artifact listing and download routes, D1 metadata + R2 byte storage split, deterministic R2 key layout, and repository wiring for artifact retrieval
- Phase 5: real SHA-256 artifact digests during publish, shared sample publish payload, and local smoke scripts for publish/list/download against Wrangler dev
- Phase 6 prep: direct reuse of the `agent-schema` package and a single `smoke:local` command for the local end-to-end flow

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
- `feat: reuse packaged schema and unify local smoke`

## Next steps

Recommended next slices:

- start Phase 6 provider import boundaries, beginning with GitHub
- make `smoke:local` CI-friendly once Wrangler local execution is wired into automation
- decide how to version and publish `@agentlibdev/agent-schema` beyond sibling-repo local development

Immediate focus for the next slice:

- define the import contract for `POST /api/v1/providers/github/import`
- fetch and validate `agent.yaml` from a GitHub repository source
- persist source repository metadata in D1 without mixing provider logic into manual publish

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

To run the same flow as a single local check:

```bash
npm run smoke:local
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

Manifest validation is enforced in `agentlib` through the sibling `@agentlibdev/agent-schema` package rather than a copied local schema module.
