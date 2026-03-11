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

The current API behavior is wired through an in-memory repository for testability. Real D1 query integration is the next step.
