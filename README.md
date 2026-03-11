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
- `POST /api/v1/publish`
- initial D1 migration and provider seed SQL

More storage and publish behavior will land in later steps once the public contracts are settled.

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
- D1-backed repository implementation for local schema/query wiring

The next step is executing these migrations against a real local D1 database and replacing bootstrap seed behavior with actual persisted data.

## Local D1 workflow

Use the local scripts from the repo root:

```bash
npm run d1:reset:local
npm run d1:list:local
```

This creates a local D1 state directory, applies the initial schema, seeds providers, and inserts sample agent/version records for local development.

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

Artifact persistence in R2 is not implemented yet. The current write path focuses on metadata persistence and version immutability.
