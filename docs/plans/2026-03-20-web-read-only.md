# Web Read-Only Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bootstrap `apps/web` as a read-only React app for browsing agents, versions, and artifacts.

**Architecture:** Add a small Vite-based React app under `apps/web` and keep it client-rendered for this first slice. The app should talk directly to the existing `/api/v1` endpoints through a tiny fetch client, expose only read-only routes, and keep styling intentional but lightweight so it can later expand into draft/import/publish flows.

**Tech Stack:** React, Vite, TypeScript, npm workspaces, existing AgentLib REST API

### Task 1: Bootstrap the web workspace

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/app.tsx`
- Modify: `package.json`

**Step 1:** Add the new workspace package and root scripts for web dev/build checks.

**Step 2:** Add a minimal Vite + React app shell.

**Step 3:** Run typecheck/build enough to confirm the app compiles.

### Task 2: Add a read-only API client and typed view models

**Files:**
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/lib/types.ts`

**Step 1:** Add typed fetch helpers for:
- `GET /api/v1/agents`
- `GET /api/v1/agents/:namespace/:name`
- `GET /api/v1/agents/:namespace/:name/versions/:version`
- `GET /api/v1/agents/:namespace/:name/versions/:version/artifacts`

**Step 2:** Keep error handling explicit and minimal.

### Task 3: Implement the read-only routes

**Files:**
- Create: `apps/web/src/routes/home-page.tsx`
- Create: `apps/web/src/routes/agent-page.tsx`
- Create: `apps/web/src/routes/version-page.tsx`
- Modify: `apps/web/src/app.tsx`

**Step 1:** Add route switching for:
- `/`
- `/agents/:namespace/:name`
- `/agents/:namespace/:name/versions/:version`

**Step 2:** Render loading, empty, and error states with deliberate styling.

### Task 4: Add artifact download links and layout styling

**Files:**
- Create: `apps/web/src/styles.css`
- Modify: route components above

**Step 1:** Surface artifacts with direct download links to the existing API routes.

**Step 2:** Add a cohesive visual language and responsive layout.

### Task 5: Document and verify

**Files:**
- Modify: `README.md`
- Modify: `docs/local-development.md`

**Step 1:** Add how to run the web app locally.

**Step 2:** Verify:

```bash
npm test
npm run typecheck
npm run build:web
```

**Step 3:** If needed, run the local web dev server and note the command in docs.

### Task 6: Commit the slice

**Files:**
- Commit all tested changes

**Step 1:** Create a focused commit.

Suggested message:

```bash
git commit -m "feat: add read-only web app"
```
