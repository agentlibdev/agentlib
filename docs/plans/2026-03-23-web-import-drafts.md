# Web Import Drafts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a small web flow that creates a GitHub import draft, lets contributors inspect it, and triggers manual publish from the draft using the existing API.

**Architecture:** Extend the current client-rendered React app with two new routes: an import form and an import draft detail page. Reuse the existing `/api/v1/providers/github/import`, `/api/v1/imports/:id`, and `/api/v1/imports/:id/publish` endpoints through a small API client expansion, keep routing local to `apps/web`, and avoid any backend contract changes.

**Tech Stack:** React, TypeScript, Vite, existing lightweight router/API client, Node test runner.

### Task 1: Define routing and API helpers by test first

**Files:**
- Modify: `apps/web/test/router.test.ts`
- Modify: `apps/web/test/api.test.ts`
- Modify: `apps/web/src/lib/router.ts`
- Modify: `apps/web/src/lib/api.ts`
- Modify: `apps/web/src/lib/types.ts`

**Step 1: Write the failing tests**

Add tests for:
- `/imports/new`
- `/imports/:id`
- API URL builders for GitHub import, import detail, and import publish

**Step 2: Run the targeted tests to verify they fail**

Run: `npm test -- --test-name-pattern="matchRoute|build.*import"`
Expected: FAIL because the new routes and API helpers do not exist yet.

**Step 3: Write minimal implementation**

Add:
- route variants for import form/detail
- path builders for import form/detail
- API endpoint builders and import-related response types

**Step 4: Run the targeted tests to verify they pass**

Run: `npm test -- --test-name-pattern="matchRoute|build.*import"`
Expected: PASS.

### Task 2: Define import draft view models by test first

**Files:**
- Add: `apps/web/test/import-view-models.test.ts`
- Modify: `apps/web/src/lib/view-models.ts`

**Step 1: Write the failing tests**

Add tests for small pure helpers that:
- decide whether a draft can be published
- expose a stable ordered artifact list for the draft page

**Step 2: Run the targeted test to verify it fails**

Run: `npm test -- --test-name-pattern="import draft"`
Expected: FAIL because the helpers do not exist yet.

**Step 3: Write minimal implementation**

Add pure helper functions only; keep React components dumb.

**Step 4: Run the targeted test to verify it passes**

Run: `npm test -- --test-name-pattern="import draft"`
Expected: PASS.

### Task 3: Implement the import form route

**Files:**
- Modify: `apps/web/src/app.tsx`
- Add: `apps/web/src/routes/import-new-page.tsx`
- Modify: `apps/web/src/routes/home-page.tsx`
- Modify: `apps/web/src/styles.css`

**Step 1: Implement the form**

Add a page that:
- accepts `repositoryUrl`
- accepts optional `ref`
- posts to the GitHub import endpoint
- disables submit while pending
- routes to `/imports/:id` on success
- shows API error text on failure

**Step 2: Keep navigation discoverable**

Add a CTA from the home page to open the import form.

**Step 3: Run focused verification**

Run: `npm run typecheck`
Expected: PASS.

### Task 4: Implement the draft detail and publish flow

**Files:**
- Modify: `apps/web/src/app.tsx`
- Add: `apps/web/src/routes/import-detail-page.tsx`
- Modify: `apps/web/src/components/breadcrumbs.tsx`
- Modify: `apps/web/src/styles.css`

**Step 1: Implement draft detail loading**

Display:
- status
- repository metadata
- manifest summary
- readme preview
- imported artifacts

**Step 2: Implement publish action**

Allow publish only while status is `draft`. On success, route to the published version page.

**Step 3: Handle edge states**

Show:
- loading
- import not found
- import already published
- publish request failure

**Step 4: Run verification**

Run: `npm test`
Expected: PASS.

### Task 5: Update contributor docs and verify the web build

**Files:**
- Modify: `README.md`
- Modify: `docs/local-development.md`

**Step 1: Document the web import flow**

Document:
- where the new UI lives
- how to reach it locally
- which API endpoints it exercises

**Step 2: Run final verification**

Run:
- `npm test`
- `npm run typecheck`
- `npm run build:web`

Expected: all PASS.
