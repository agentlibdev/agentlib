# Local And Staging Runbook

This runbook is for a human operator who wants to bring up `agentlib` and run a basic smoke check.

It covers two modes:

- local development on one machine
- a VPS-style staging host using the same single Worker process

## What is verified today

The current codebase has been verified in this shape:

- `npm install`
- `npm run build:web`
- `npm run d1:reset:local`
- `npm run dev:api:local`
- `GET /health`
- `GET /`
- `GET /imports/new`

That means a single Wrangler local Worker can currently serve:

- API routes such as `/api/v1/agents`
- the built web shell from `apps/web/dist`
- SPA routes such as `/imports/new`

## Mode 1: Local bring-up

### Requirements

- Node.js `>=20`
- npm

### Install

From the repository root:

```bash
npm install
```

### Build the web app

This is the recommended path when you want one process to serve both API and web:

```bash
npm run build:web
```

### Reset local data

```bash
npm run d1:reset:local
```

This recreates local D1 state under `.wrangler/state`, applies the initial migration, seeds providers, and inserts sample agents.

### Start the Worker

```bash
npm run dev:api:local
```

By default this serves on:

```text
http://127.0.0.1:8787
```

### Basic smoke checks

Run these in a second terminal:

```bash
curl -s http://127.0.0.1:8787/health
curl -i http://127.0.0.1:8787/
curl -i http://127.0.0.1:8787/imports/new
curl -s http://127.0.0.1:8787/api/v1/agents
```

Expected results:

- `/health` returns JSON with `"ok": true`
- `/` returns `200` and HTML for the web shell
- `/imports/new` returns `200` and the same SPA HTML shell
- `/api/v1/agents` returns JSON

### Optional local product checks

Publish/import helpers:

```bash
npm run publish:sample:local
npm run list:artifacts:local -- raul code-reviewer 0.3.0
npm run import:github:local -- https://github.com/agentlibdev/agent-examples main
```

One-command local smoke:

```bash
npm run smoke:local
```

If you also want to test the Go CLI against the local registry:

```bash
AGENTLIB_BASE_URL=http://127.0.0.1:8787 agentlib search reviewer
AGENTLIB_BASE_URL=http://127.0.0.1:8787 agentlib show raul/code-reviewer@0.3.1
AGENTLIB_BASE_URL=http://127.0.0.1:8787 agentlib install raul/code-reviewer@0.3.1
```

## Mode 2: VPS staging

This mode is useful for a human staging server, but it is not the same as a real Cloudflare deployment.

What it is:

- one VPS
- one local Wrangler Worker process
- local D1/R2-compatible state under `.wrangler/state`
- built web assets served by the same Worker

What it is not:

- real Cloudflare D1
- real Cloudflare R2
- production-equivalent networking or auth

### Recommended staging shape

On the VPS:

```bash
git clone <repo>
cd agentlib
npm install
npm run build:web
npm run d1:reset:local
npm run dev:api:local
```

The Worker still binds to:

```text
127.0.0.1:8787
```

That is deliberate. Expose it in one of these two ways:

1. SSH tunnel for private operator access.
2. Reverse proxy from Nginx or Caddy to `127.0.0.1:8787`.

### Minimal staging smoke checklist

From the VPS itself or through the reverse proxy:

```bash
curl -s http://127.0.0.1:8787/health
curl -i http://127.0.0.1:8787/
curl -i http://127.0.0.1:8787/imports/new
curl -s http://127.0.0.1:8787/api/v1/agents
```

If you expose the service via a domain, repeat those checks against the public staging URL.

### VPS process notes

For a longer-lived staging process, run the Worker under a supervisor such as:

- `systemd`
- `supervisord`
- `tmux` or `screen` for temporary use only

### Current staging limitation

This runbook verifies that a human can start and inspect the system on a VPS-like host. It does not replace the real Cloudflare deploy flow in [README.md](/home/raul/agentlibdev/agentlib/README.md).

## Troubleshooting

- If `d1:reset:local` fails, ensure Wrangler can write logs and open localhost ports on that machine.
- If `dev:api:local` says `Address already in use`, stop the previous Worker or free port `8787`.
- If `/` works but `/api/...` fails, make sure the Worker started after `d1:reset:local`.
- If you need separate frontend HMR while developing UI, use `npm run dev:web`, but that is not required for the staging-style single-process path above.
