# Manual Registry, Auth, and Ownership Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a first-class manual registry creation flow in the web app, improve the visual design toward an npm package-style information layout, and stage the follow-on work for real user ownership with Google/GitHub OAuth plus lifecycle controls.

**Architecture:** Reuse the existing `POST /api/v1/publish` path for the first slice so manual creation ships without waiting on auth. Introduce user/account ownership and lifecycle metadata as a second slice behind an explicit architecture checkpoint because they change the persistent model, API contracts, and web permissions model.

**Tech Stack:** TypeScript, React, Cloudflare Workers, D1, R2-ready artifact storage, Node test runner

### Task 1: Lock the manual web flow contract in tests

**Files:**
- Modify: `apps/web/test/router.test.ts`
- Modify: `apps/web/test/api.test.ts`
- Create: `apps/web/test/manual-publish.test.ts`

**Step 1: Write the failing tests**

Add tests for:
- a dedicated manual creation route in the web router
- the API helper for `POST /api/v1/publish`
- request payload assembly from manual form fields and uploaded files

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because the route, helper, and payload builder do not exist yet

### Task 2: Implement the manual registry creation page

**Files:**
- Modify: `apps/web/src/app.tsx`
- Modify: `apps/web/src/lib/router.ts`
- Modify: `apps/web/src/lib/api.ts`
- Modify: `apps/web/src/lib/types.ts`
- Create: `apps/web/src/lib/manual-publish.ts`
- Create: `apps/web/src/routes/manual-publish-page.tsx`

**Step 1: Write minimal implementation**

Add:
- a route that renders a manual create page
- a form for namespace, name, version, title, description, license, summary, README
- file uploads for package artifacts
- submit wiring to `POST /api/v1/publish`
- redirect to the published version page on success

**Step 2: Run verification**

Run: `npm test`
Expected: PASS for the new web tests

### Task 3: Redesign the registry surfaces

**Files:**
- Modify: `apps/web/src/routes/home-page.tsx`
- Modify: `apps/web/src/routes/manual-publish-page.tsx`
- Modify: `apps/web/src/styles.css`

**Step 1: Apply the visual redesign**

Align the information density and hierarchy with an npm package page:
- clearer header structure
- stronger content columns/panels
- package-style metadata emphasis
- primary manual publish CTA
- GitHub import retained as secondary intake

Keep:
- AgentLib palette and tone from the existing site/theme
- current mobile support
- existing registry browsing routes

**Step 2: Run verification**

Run:
- `npm test`
- `npm run typecheck`

Expected:
- PASS

### Task 4: Define the auth and ownership slice for approval

**Files:**
- Modify: `docs/plans/2026-03-26-manual-registry-auth-ownership.md`
- Create later after approval: auth/data-model/API files

**Step 1: Present the architecture checkpoint**

Document:
- problem: anonymous publish/import is not enough for ownership and lifecycle management
- proposal: user accounts with Google and GitHub OAuth, agents owned by a user or org namespace, write permissions enforced in API
- alternatives considered:
  - GitHub-only auth first
  - magic link/email auth
  - anonymous draft plus later claim flow
- trade-offs across speed, trust, identity quality, and implementation complexity

**Step 2: Wait for approval before changing public contracts**

Do not yet freeze:
- auth endpoints
- ownership schema
- lifecycle status enums
- edit/delete semantics

### Task 5: Ownership, lifecycle, and user workspace after approval

**Files:**
- Modify later: `migrations/0001_initial.sql` or follow-up migration
- Modify later: `apps/api/src/create-app.ts`
- Modify later: `apps/api/src/d1-agent-repository.ts`
- Modify later: `apps/web/src/app.tsx`
- Create later: auth/session modules and user workspace routes

**Step 1: Add the backend model**

Add:
- users
- organizations
- namespace ownership mapping
- agent lifecycle states such as `active`, `deprecated`, `unmaintained`
- write permissions for edit, delete, and status transitions

**Step 2: Add web account flows**

Add:
- sign in with Google
- sign in with GitHub
- user/org dashboard
- owned agents listing
- edit/delete/status actions

**Step 3: Verify**

Run the relevant API, repository, and web tests after the approved implementation lands.
