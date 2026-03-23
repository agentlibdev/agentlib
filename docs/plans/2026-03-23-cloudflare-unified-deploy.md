# Cloudflare Unified Deploy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy the AgentLib API and web app together through one Cloudflare Worker that serves static web assets and keeps handling `/api/*` plus `/health`.

**Architecture:** Keep the current Worker entrypoint as the single runtime and teach it to return static assets for non-API routes via Cloudflare Workers Assets. API routes and `/health` remain code-handled; everything else falls back to the built web app's `index.html`, allowing the React client router to own the UI paths.

**Tech Stack:** TypeScript, Cloudflare Workers, Wrangler assets, Vite build output, Node test runner.

### Task 1: Define SPA fallback behavior in tests

**Files:**
- Modify: `apps/api/test/health.test.ts`
- Modify: `apps/api/src/index.ts`

**Step 1: Write the failing tests**

Add tests that prove:
- `/health` still returns JSON from the Worker
- `/api/v1/agents` still stays in the API code path
- a non-API route like `/imports/new` falls back to an assets handler when present

**Step 2: Run the targeted tests to verify they fail**

Run: `npm test`
Expected: FAIL because the Worker does not yet know how to delegate non-API routes to assets.

**Step 3: Write minimal implementation**

Introduce a small route split in the Worker entrypoint:
- API + `/health` -> existing app
- everything else -> `env.ASSETS.fetch(request)` when available

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

### Task 2: Add Wrangler assets configuration

**Files:**
- Modify: `wrangler.jsonc`

**Step 1: Point Wrangler at the web build output**

Configure assets to serve `apps/web/dist`.

**Step 2: Keep the current bindings intact**

Do not change existing D1/R2 bindings.

### Task 3: Add deploy-facing scripts and docs

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/local-development.md`

**Step 1: Add explicit production build script**

Add a script that builds the web bundle before deploy.

**Step 2: Document the deploy flow**

Document:
- build web
- deploy worker
- single-domain behavior

### Task 4: Final verification

**Files:**
- Verify existing test/build paths only

**Step 1: Run the full verification set**

Run:
- `npm test`
- `npm run typecheck`
- `npm run build:web`

Expected: all PASS.
