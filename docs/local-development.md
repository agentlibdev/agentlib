# Local Development

This guide is for developers and contributors working on `agentlib` locally.

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
npm run d1:reset:local
npm run dev:api:local
```

This does the following:

- creates local D1 state under `.wrangler/state`
- applies the initial migration
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
npm run d1:reset:local
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

This orchestrates the local flow end-to-end:

- resets local D1 state
- starts Wrangler local dev
- publishes a sample package
- lists its artifacts
- downloads one artifact
- validates expected output

## Web app local development

Start the API and web app in separate terminals:

```bash
npm run dev:api:local
npm run dev:web
```

The web app runs on `http://127.0.0.1:4173` and proxies `/api` requests to the local Worker.

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
npm run publish:sample:local
npm run list:artifacts:local -- raul code-reviewer 0.3.0
npm run download:artifact:local -- raul code-reviewer 0.3.0 README.md
```

Useful read endpoints after publish:

```text
GET /api/v1/agents/:namespace/:name/versions/:version/artifacts
GET /api/v1/agents/:namespace/:name/versions/:version/artifacts/:path
```

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
- If `smoke:local` fails after an interrupted run, reset local state with `npm run d1:reset:local`.
- If port `8787` is already in use, stop the previous local Worker before starting a new one.
