# agentlib

Cloudflare-first public registry for portable AI agents.

## Current scope

This worktree bootstraps the first registry slice:

- TypeScript monorepo skeleton
- Cloudflare Worker entrypoint
- `GET /health`
- explicit JSON 404 response

More storage and publish behavior will land in later steps once the public contracts are settled.

## Local requirements

- Node.js `>=20` is required to run `wrangler` locally.
- The current codebase can still be typechecked and unit-tested without `wrangler`.
