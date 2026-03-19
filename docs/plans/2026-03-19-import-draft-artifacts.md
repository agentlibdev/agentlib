# Import Draft Artifacts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend persisted GitHub import drafts so they capture `README.md` and artifact snapshots, allowing publish-from-draft to create a complete package instead of metadata-only versions.

**Architecture:** Keep import as the place where provider-specific fetching happens. When creating a draft, fetch the manifest plus selected package files, store normalized draft file snapshots, and make publish-from-draft reuse those stored bytes rather than calling GitHub again.

**Tech Stack:** TypeScript, Cloudflare Workers, D1, R2, Node test runner, Wrangler local dev

### Task 1: Define draft snapshot fields and route expectations

**Files:**
- Modify: `packages/core/src/agent-record.ts`
- Modify: `apps/api/test/agents.test.ts`

**Step 1: Write the failing test**

Add tests that require import draft responses to include:
- `readme`
- `artifacts[]` metadata

Add a publish-from-draft expectation that results in artifact persistence, not metadata-only publish.

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because draft responses do not yet include file snapshots.

### Task 2: Persist draft file snapshots in D1

**Files:**
- Modify: `migrations/0001_initial.sql`
- Modify: `apps/api/src/d1-agent-repository.ts`
- Modify: `apps/api/test/d1-agent-repository.test.ts`

**Step 1: Write the failing test**

Add tests for:
- creating import draft rows with stored `readme` and artifact payload metadata
- reading draft detail with the stored snapshots

**Step 2: Implement minimal persistence**

Add tables or columns for draft file snapshots, keeping the first version simple and reviewable.

### Task 3: Extend GitHub client to fetch package files

**Files:**
- Modify: `packages/providers/src/github-client.ts`
- Modify: `apps/api/src/d1-agent-repository.ts`
- Test: `apps/api/test/d1-agent-repository.test.ts`

**Step 1: Implement the smallest useful file import**

Fetch:
- `agent.yaml`
- `README.md`

Optionally allow a minimal artifact list initially restricted to these known files.

### Task 4: Publish full package from draft

**Files:**
- Modify: `apps/api/src/d1-agent-repository.ts`
- Modify: `apps/api/src/in-memory-agent-repository.ts`
- Test: `apps/api/test/d1-agent-repository.test.ts`

**Step 1: Write the failing test**

Require `publishImportDraft` to call the existing publish pipeline with:
- draft manifest
- draft `readme`
- draft artifacts

### Task 5: Update docs and helpers

**Files:**
- Modify: `README.md`
- Optionally create: `scripts/import-github-local.mjs`
- Optionally create: `scripts/show-import-draft-local.mjs`

**Step 1: Verification**

Run:
- `npm test`
- `npm run typecheck`
- `npm run smoke:local`

Expected:
- existing publish/artifact flow remains green
- draft publish now produces a full package snapshot from imported files
