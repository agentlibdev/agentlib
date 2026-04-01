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
- read-only React web app in `apps/web`
- `POST /api/v1/publish`
- `POST /api/v1/providers/github/import`
- `GET /api/v1/imports/:id`
- `POST /api/v1/imports/:id/publish`
- `GET /api/v1/session`
- `GET /api/v1/auth/github/start`
- `GET /api/v1/auth/github/callback`
- `GET /api/v1/auth/google/start`
- `GET /api/v1/auth/google/callback`
- `POST /api/v1/auth/logout`
- `PATCH /api/v1/agents/:namespace/:name`
- initial D1 migration and provider seed SQL

More storage and publish behavior will land in later steps once the public contracts are settled.

## Recap

Completed so far:

- Phase 2: monorepo skeleton, Worker entrypoint, health endpoint, read-only agent endpoints, initial D1 schema, provider seed data, and local D1 workflow
- Phase 3: manual/local publish alpha, manifest validation, immutable version rejection, metadata persistence in D1
- Phase 4: artifact listing and download routes, D1 metadata + R2 byte storage split, deterministic R2 key layout, and repository wiring for artifact retrieval
- Phase 5: real SHA-256 artifact digests during publish, shared sample publish payload, and local smoke scripts for publish/list/download against Wrangler dev
- Phase 6 prep: direct reuse of the `agent-schema` package and a single `smoke:local` command for the local end-to-end flow
- Phase 6 slice 1: GitHub import preview boundary with route, provider client abstraction, `source_repositories` upsert, and manifest validation before publish orchestration
- Phase 6 slice 2: persisted import drafts and manual publish-from-draft endpoints
- Phase 6 slice 3: draft snapshots now store `README.md` and artifact payloads for publish-from-draft
- Phase 7 slice 2: web import draft UI for create, inspect, and manual publish
- Phase 7 slice 3: unified Cloudflare deploy for API plus web assets from one Worker
- Phase 8 slice 1: ownership and lifecycle backend foundation with authenticated publish/import mutations

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
- `feat: add github import preview boundary`
- `feat: add import drafts and manual publish`
- `feat: import README and artifacts into drafts`
- `feat: broaden import draft coverage and errors`
- `feat: add read-only web app`
- `feat: add web import drafts flow`
- `feat: add unified Cloudflare deploy`

## Next steps

Recommended next slices:

- make `smoke:local` CI-friendly once Wrangler local execution is wired into automation
- decide how to version and publish `@agentlibdev/agent-schema` beyond sibling-repo local development
- broaden imported package coverage beyond the canonical file set (`agent.yaml`, `README.md`, `agent.md`, `LICENSE`)

Immediate focus for the next slice:

- broaden imported package coverage beyond the canonical file set
- add more provider-side verification for rate limit and 5xx handling
- make the local import flow part of a wider end-to-end verification path

## Local requirements

- Node.js `>=20` is required to run `wrangler` locally.
- The current codebase can still be typechecked and unit-tested without `wrangler`.

For a developer/contributor-focused local setup guide, see [docs/local-development.md](/home/raul/agentlibdev/agentlib/docs/local-development.md).

For a human operator quickstart covering both local bring-up and a VPS-style staging host, see [docs/runbooks/local-and-staging.md](/home/raul/agentlibdev/agentlib/docs/runbooks/local-and-staging.md).

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
npm run db:reset:local
npm run d1:list:local
```

This creates a local D1 state directory, applies all local SQL migrations in order, seeds providers, and inserts sample agent/version records for local development.

The local seed scripts are safe to re-run on the same local D1 state. They are intended as idempotent fixtures, not as a data refresh mechanism.

To exercise the HTTP publish path against local D1:

```bash
npm run dev:api:local
npm run publish:fixture:local
npm run publish:dir:local -- ../agent-examples
npm run list:artifacts:local -- raul code-reviewer 0.3.0
npm run download:artifact:local -- raul code-reviewer 0.3.0 README.md
npm run d1:list:local
npm run d1:list:artifacts:local
```

`publish:fixture:local` posts the fixed smoke fixture. `publish:dir:local` publishes a real example package directory that already contains `agent.yaml` and `README.md`, with optional `agent.md` and `LICENSE` included when present.

To load a richer visual demo with multiple users, agents, artifacts, downloads, pins, and stars:

```bash
npm run dev:api:local
npm run demo:populate:local
```

`demo:populate:local` targets the local API on `http://127.0.0.1:8787`, so it expects the Worker to already be running.

To run the same flow as a single local check:

```bash
npm run smoke:local
```

After publishing, you can fetch artifact metadata and contents through:

```text
GET /api/v1/agents/:namespace/:name/versions/:version/artifacts
GET /api/v1/agents/:namespace/:name/versions/:version/artifacts/:path
```

## Web app

The web slice in `apps/web` currently supports:

- home/list view for agents
- local filter on the catalog view
- registry momentum summary and top agents
- agent detail view
- version detail view
- breadcrumbs between registry, agent, and version pages
- artifact download links
- GitHub import form at `/imports/new`
- import draft detail and manual publish flow at `/imports/:id`
- account workspace at `/account`
- linked OAuth identities
- editable public profile fields
- lifecycle controls for owned agents

Local dev:

```bash
npm run dev:api:local
npm run dev:web
```

The Vite dev server runs on `http://127.0.0.1:4173` and proxies `/api` to the local Worker on `http://127.0.0.1:8787`.

The web import flow exercises the existing API endpoints directly:

- `POST /api/v1/providers/github/import`
- `GET /api/v1/imports/:id`
- `POST /api/v1/imports/:id/publish`

## Unified Cloudflare deploy

`agentlib` now deploys the API Worker and the built web app together from the same `wrangler.jsonc`.

Current deploy shape:

- `/health` and `/api/*` stay in Worker code
- non-API routes are served from the built `apps/web/dist` assets bundle
- SPA routes such as `/imports/new` and `/imports/:id` resolve through the web app on the same domain

Deploy flow:

```bash
npm run build:deploy
npm run deploy
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

- requires an authenticated actor
- constrains new publishes to the authenticated user handle namespace
- returns `201` for a new version
- returns `409` if `namespace/name@version` already exists
- returns `403` if the namespace is owned by someone else
- returns `400` for invalid payloads
- returns `400` if the manifest fails AgentLib schema validation

Additional authenticated mutation/readiness endpoints:

- `GET /api/v1/session` returns the current authenticated actor derived by the Worker
- OAuth start/callback routes exist for GitHub and Google and persist a signed `agentlib_session` cookie
- `POST /api/v1/auth/logout` clears the signed session cookie
- `PATCH /api/v1/agents/:namespace/:name` updates lifecycle state to `active`, `deprecated`, or `unmaintained` for the owner

OAuth configuration required in the Worker environment:

- `AUTH_COOKIE_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

For local development, copy [`.dev.vars.example`](/home/raul/agentlibdev/agentlib/.worktrees/manual-registry-auth/.dev.vars.example) to [`.dev.vars`](/home/raul/agentlibdev/agentlib/.worktrees/manual-registry-auth/.dev.vars) and fill in the real values. `.dev.vars` is ignored by git.

Artifact metadata is persisted in D1 and artifact bytes are stored in R2. D1 keeps the `r2_key`, media type, size and checksum placeholders; it no longer stores inline artifact payloads.

Artifact checksums are stored as real SHA-256 hex digests during publish.

Manifest validation is enforced in `agentlib` through the sibling `@agentlibdev/agent-schema` package rather than a copied local schema module.

## GitHub import draft flow

The first provider import slice now exposes:

```text
POST /api/v1/providers/github/import
GET /api/v1/imports/:id
POST /api/v1/imports/:id/publish
```

Request shape:

```json
{
  "repositoryUrl": "https://github.com/owner/repo",
  "ref": "main"
}
```

Local helper:

```bash
npm run import:github:local -- https://github.com/owner/repo main
```

Current behavior:

- validates request shape and GitHub repository URL
- resolves public repository metadata through the provider client
- fetches and validates `agent.yaml`
- snapshots canonical package files into the draft when present: `README.md`, `agent.md`, `LICENSE`
- upserts normalized repository metadata into `source_repositories`
- persists an import draft in `import_drafts`
- returns a normalized draft payload with `id` and `status`
- allows manual publish from a persisted draft

Current limitation:

- imported package snapshots currently cover the canonical file set only; broader repo file selection is the next expansion point

Current error responses:

- `400 invalid_import_request`
- `400 unsupported_repository_url`
- `404 repository_not_found`
- `404 manifest_not_found`
- `422 invalid_manifest`
- `502 github_rate_limited`
- `502 github_upstream_error`
