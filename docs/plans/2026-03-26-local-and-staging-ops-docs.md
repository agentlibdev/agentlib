# Local And Staging Ops Docs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Document a single operator-facing path to bring up AgentLib locally and on a VPS-style staging host, then verify the documented basic checks against the current codebase.

**Architecture:** Keep the existing `docs/local-development.md` for contributor setup, but add a new runbook focused on human bring-up and smoke checks. The runbook should describe the simplest verified path: local D1 reset, single Worker serving API plus built web assets, and a VPS staging mode using the same local Worker behind SSH tunneling or a reverse proxy. Avoid claiming unverified Cloudflare production semantics on a generic VPS.

**Tech Stack:** Markdown docs, npm scripts, Wrangler local dev, local D1, built web assets, curl.

### Task 1: Capture the verified operational path

**Files:**
- Create: `docs/runbooks/local-and-staging.md`
- Modify: `README.md`
- Modify: `docs/local-development.md`

**Step 1: Summarize the currently verified flow**

Cover:
- `npm install`
- `npm run build:web`
- `npm run d1:reset:local`
- `npm run dev:api:local`
- `/health`, `/`, `/imports/new`

**Step 2: Describe the local basic test sequence**

Include:
- API health
- web shell load
- agent list endpoint
- publish/import helpers

### Task 2: Document the VPS staging variant

**Files:**
- Create: `docs/runbooks/local-and-staging.md`

**Step 1: Describe the staging shape honestly**

Clarify:
- this is a single-process local-mode staging host
- it uses local D1/R2 state, not real Cloudflare bindings
- recommended access paths are SSH tunnel or reverse proxy to `127.0.0.1:8787`

**Step 2: Add a basic smoke checklist**

Include:
- `/health`
- `/`
- `/imports/new`
- `/api/v1/agents`

### Task 3: Link the runbook and verify docs consistency

**Files:**
- Modify: `README.md`
- Modify: `docs/local-development.md`

**Step 1: Add links from the current docs**

**Step 2: Run a minimal doc-focused verification**

Run:

```bash
npm test
npm run typecheck
npm run build:web
```

Confirm the documented routes and commands match the verified local flow.
