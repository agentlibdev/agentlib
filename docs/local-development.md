# Local Development

This guide is for developers and contributors working on `agentlib` locally.

If you want the shortest operator-facing path to bring up the full stack and run a basic smoke check, including a VPS-style staging host, see [docs/runbooks/local-and-staging.md](/home/raul/agentlibdev/agentlib/docs/runbooks/local-and-staging.md).

## Requirements

- Node.js `>=20`
- npm

Wrangler is installed through the project dependencies, so no global install is required.

## Install dependencies

From the repository root:

```bash
npm install
```

## Quickstart

For a first local run:

```bash
npm run db:reset:local
npm run dev:api:local
```

This does the following:

- creates local D1 state under `.wrangler/state`
- applies all local SQL migrations in order
- seeds provider data
- inserts sample agent/version records for local development
- starts the Worker locally on `127.0.0.1:8787`

Once the API is running, verify it with:

```bash
curl -s http://127.0.0.1:8787/health
```

## Common local workflows

### Reset local data

```bash
npm run db:reset:local
```

### Inspect local D1 contents

```bash
npm run d1:list:local
npm run d1:list:artifacts:local
```

### Run tests without Wrangler

```bash
npm test
npm run typecheck
npm run build:web
```

### Run the end-to-end local smoke flow

```bash
npm run smoke:local
```

This orchestrates the real local flow end-to-end:

- resets local D1 state
- starts Wrangler local dev
- populates authenticated demo agents with real artifacts
- runs the sibling `agent-cli` smoke against a real published package
- validates install, activation, status, deactivate, and remove

Requirements:

- sibling checkout at `../agent-cli`, or `AGENTLIB_CLI_DIR=/absolute/path/to/agent-cli`
- Go toolchain available at `$HOME/.local/go/bin`, or `AGENTLIB_GO_BIN_DIR=/custom/go/bin`

Useful overrides:

```bash
AGENTLIB_SMOKE_REF=acme/support-triager@0.2.0 npm run smoke:local
AGENTLIB_CLI_DIR=/path/to/agent-cli npm run smoke:local
```

## Web app local development

Start the API and web app in separate terminals:

```bash
npm run dev:api:local
npm run dev:web
```

The web app runs on `http://127.0.0.1:4173` and proxies `/api` requests to the local Worker.

For production deploys, the separate Vite server is no longer required. Cloudflare serves the built `apps/web/dist` bundle from the same Worker that handles `/health` and `/api/*`.

Current web routes:

- `/` registry home
- `/agents/:namespace/:name`
- `/agents/:namespace/:name/versions/:version`
- `/imports/new`
- `/imports/:id`

## Manual publish flow

Start the local API:

```bash
npm run dev:api:local
```

In a second terminal:

```bash
npm run publish:fixture:local
npm run publish:dir:local -- ../agent-examples
npm run list:artifacts:local -- raul code-reviewer 0.3.0
npm run download:artifact:local -- raul code-reviewer 0.3.0 README.md
```

Use the helpers like this:

- `publish:fixture:local` publishes the fixed smoke fixture used by the repo.
- `publish:dir:local` publishes a real example package directory, such as the root fixture in `../agent-examples`.
- `demo:populate:superpowers:local` publishes a real monolithic repository snapshot as `obra/superpowers`.

Useful read endpoints after publish:

```text
GET /api/v1/agents/:namespace/:name/versions/:version/artifacts
GET /api/v1/agents/:namespace/:name/versions/:version/artifacts/:path
```

Example monolithic repository populate:

```bash
npm run dev:api:local
npm run demo:populate:superpowers:local -- /path/to/superpowers
```

Current behavior:

- publishes `obra/superpowers`
- marks it as `repository-snapshot`
- carries compatibility metadata for major skill-capable agents
- includes the repository artifact tree recursively, excluding local junk such as `.git` and `node_modules`

GitHub-backed variant:

```bash
npm run dev:api:local
npm run demo:populate:superpowers:github -- https://github.com/obra/superpowers main
```

This clones the repository to a temporary directory, publishes it through the same monolithic repository helper, and then deletes the temporary checkout.

## GitHub import draft flow

The current provider slice supports:

```text
POST /api/v1/providers/github/import
GET /api/v1/imports/:id
POST /api/v1/imports/:id/publish
```

Example helper command:

```bash
npm run import:github:local -- https://github.com/owner/repo main
```

Equivalent raw HTTP request:

```bash
curl -s \
  -X POST \
  http://127.0.0.1:8787/api/v1/providers/github/import \
  -H 'content-type: application/json' \
  -d '{
    "repositoryUrl": "https://github.com/owner/repo",
    "ref": "main"
  }'
```

Current behavior:

- validates the GitHub repository URL
- fetches repository metadata and `agent.yaml`
- snapshots canonical files into the draft when present: `README.md`, `agent.md`, `LICENSE`
- validates the manifest
- persists an import draft
- allows manual publish from that draft

Equivalent web flow:

1. Open `http://127.0.0.1:4173/imports/new`
2. Paste a public GitHub repository URL and optional ref
3. Inspect the resulting draft at `/imports/:id`
4. Publish manually from the draft page

Current limitation:

- imported snapshots currently include only the canonical file set
- broader artifact import has not landed yet

## Troubleshooting

- If local Wrangler commands fail, confirm Node.js `>=20`.
- If `smoke:local` fails after an interrupted run, reset local state with `npm run db:reset:local`.
- If port `8787` is already in use, stop the previous local Worker before starting a new one.

## Cloudflare deploy flow

Production deploy uses one Worker plus static assets:

```bash
npm run build:deploy
npm run deploy
```

That deploy publishes:

- Worker-handled routes: `/health`, `/api/*`
- asset-backed SPA routes: `/`, `/agents/...`, `/imports/...`
