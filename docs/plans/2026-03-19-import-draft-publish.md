# Import Draft Publish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend GitHub import from preview-only into a persisted draft workflow that users can review and then publish manually through the existing immutable publish pipeline.

**Architecture:** Keep provider import and publish as separate concerns. GitHub import should persist a normalized import draft record plus manifest snapshot and source repository linkage; a new publish-from-draft endpoint should reuse the existing publish pipeline rather than duplicating version creation logic.

**Tech Stack:** TypeScript, Cloudflare Workers, D1, R2, Node test runner, Wrangler local dev

### Task 1: Define draft domain types and route expectations

**Files:**
- Modify: `packages/core/src/agent-record.ts`
- Modify: `packages/core/src/agent-repository.ts`
- Modify: `apps/api/test/agents.test.ts`

**Step 1: Write the failing test**

Add route tests for:
- `POST /api/v1/providers/github/import` returning `201` with persisted draft metadata
- `GET /api/v1/imports/:id` returning draft detail
- `POST /api/v1/imports/:id/publish` returning published agent identity

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because draft types and routes do not exist yet.

### Task 2: Add route-level draft handling

**Files:**
- Modify: `apps/api/src/create-app.ts`
- Modify: `apps/api/test/agents.test.ts`

**Step 1: Write minimal implementation**

Add:
- route parsing for draft read and draft publish
- explicit JSON error mapping for missing draft and invalid draft state
- repository method calls for `getImportDraft` and `publishImportDraft`

**Step 2: Run verification**

Run: `npm test`
Expected: route tests pass with repository stubs.

### Task 3: Persist import drafts in D1

**Files:**
- Modify: `migrations/0001_initial.sql`
- Modify: `apps/api/src/d1-agent-repository.ts`
- Modify: `apps/api/test/d1-agent-repository.test.ts`

**Step 1: Write the failing test**

Add tests for:
- creating a draft row from GitHub import
- reading draft detail
- publishing a draft through the existing publish path

**Step 2: Implement minimal persistence**

Add an `import_drafts` table with:
- `id`
- `source_repository_id`
- `provider`
- `status`
- `resolved_ref`
- `manifest_json`
- `created_at`
- `updated_at`
- optional published linkage if needed for idempotency

### Task 4: Wire in-memory repository for route tests

**Files:**
- Modify: `apps/api/src/in-memory-agent-repository.ts`
- Modify: `apps/api/test/agents.test.ts`

**Step 1: Implement the smallest in-memory draft store**

Support:
- draft creation from GitHub import
- draft lookup by id
- manual publish from draft

### Task 5: Reuse publish logic from draft

**Files:**
- Modify: `apps/api/src/d1-agent-repository.ts`
- Possibly modify: `packages/core/src/agent-record.ts`
- Test: `apps/api/test/d1-agent-repository.test.ts`

**Step 1: Implement draft publish path**

Rules:
- only `draft` status is publishable
- publish reuses current version immutability checks
- successful publish transitions draft state and records published version identity

### Task 6: Update docs and local verification

**Files:**
- Modify: `README.md`
- Optionally create: `scripts/import-github-local.mjs`
- Optionally create: `scripts/publish-import-draft-local.mjs`

**Step 1: Run verification**

Run:
- `npm test`
- `npm run typecheck`
- `npm run smoke:local`

Optional:
- local import draft helper
- local publish-from-draft helper

Expected:
- all existing checks remain green
- draft flow is documented and reproducible
