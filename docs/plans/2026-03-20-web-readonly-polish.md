# Web Read-Only Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve the read-only web app so it feels more usable and product-ready without changing the backend contract.

**Architecture:** Keep the current client-rendered React app and focus on a UI/product polish slice. Add a tiny pure view-model helper layer for searchable agent lists and breadcrumbs so the behavior can be covered with small tests. Leave data fetching and routes intact.

**Tech Stack:** React, TypeScript, Vite, npm workspaces, existing AgentLib REST API

### Task 1: Add failing tests for polish helpers

**Files:**
- Create: `apps/web/test/view-models.test.ts`
- Create: `apps/web/src/lib/view-models.ts`

**Step 1:** Write tests for:
- filtering agents by slug/title/description
- breadcrumb generation for home, agent, and version pages

**Step 2:** Run tests to confirm they fail before implementation.

Run: `npm test`
Expected: FAIL because the helper module does not exist yet.

### Task 2: Implement the helper layer

**Files:**
- Create: `apps/web/src/lib/view-models.ts`

**Step 1:** Add pure helpers for:
- `filterAgents(agents, query)`
- `buildBreadcrumbs(route)`

**Step 2:** Re-run tests and confirm the new helper tests pass.

### Task 3: Wire polish into the UI

**Files:**
- Modify: `apps/web/src/app.tsx`
- Modify: `apps/web/src/routes/home-page.tsx`
- Modify: `apps/web/src/routes/agent-page.tsx`
- Modify: `apps/web/src/routes/version-page.tsx`
- Modify: `apps/web/src/styles.css`

**Step 1:** Add a local search/filter input on the home page.

**Step 2:** Add breadcrumbs and back-navigation context on agent/version pages.

**Step 3:** Improve empty/error/loading states and artifact/version presentation.

### Task 4: Update docs and verify

**Files:**
- Modify: `README.md`
- Modify: `docs/local-development.md`

**Step 1:** Update docs if the local web workflow or UX description changes.

**Step 2:** Verify:

```bash
npm test
npm run typecheck
npm run build:web
```

### Task 5: Commit the slice

**Files:**
- Commit all tested changes

**Step 1:** Create a focused commit.

Suggested message:

```bash
git commit -m "feat: polish read-only web app"
```
