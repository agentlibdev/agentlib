# Artifact Retrieval And R2 Storage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete artifact listing/download routes and move artifact content storage from inline D1 payloads to R2-backed objects referenced by D1 metadata.

**Architecture:** Keep D1 as the source of artifact metadata and published version relationships, but store artifact bytes in R2 under deterministic keys. Extend the repository abstraction with artifact read methods while injecting an R2-backed storage dependency into the D1 repository so publish and retrieval flows share one storage contract.

**Tech Stack:** TypeScript, Cloudflare Workers, D1, R2, Node test runner

### Task 1: Define artifact route behavior in tests

**Files:**
- Modify: `apps/api/test/agents.test.ts`

**Step 1: Write the failing test**

Add tests for:
- `GET /api/v1/agents/:namespace/:name/versions/:version/artifacts`
- `GET /api/v1/agents/:namespace/:name/versions/:version/artifacts/:path`
- `404` responses for unknown artifact metadata/content

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because artifact repository methods and routes are not available yet

### Task 2: Define storage contracts and environment bindings

**Files:**
- Modify: `packages/core/src/agent-record.ts`
- Modify: `packages/core/src/agent-repository.ts`
- Create: `packages/storage/src/artifact-storage.ts`
- Modify: `apps/api/src/env.ts`
- Modify: `apps/api/src/create-repository.ts`
- Modify: `wrangler.jsonc`

**Step 1: Add minimal types**

Add:
- artifact metadata/content types
- repository read methods for artifacts
- storage interface for `putArtifact` / `getArtifact`
- `ARTIFACTS` R2 binding in the worker environment

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: FAIL until route and repository implementations catch up

### Task 3: Implement artifact routes and in-memory behavior

**Files:**
- Modify: `apps/api/src/create-app.ts`
- Modify: `apps/api/src/in-memory-agent-repository.ts`

**Step 1: Write minimal implementation**

Add:
- artifact listing route
- artifact download route
- JSON `404` responses for missing artifacts
- in-memory artifact storage for route tests

**Step 2: Run verification**

Run: `npm test`
Expected: PASS for route tests and FAIL only where D1/R2 integration is still missing

### Task 4: Move artifact persistence from D1 inline content to R2-backed storage

**Files:**
- Modify: `migrations/0001_initial.sql`
- Modify: `apps/api/src/d1-agent-repository.ts`
- Modify: `apps/api/test/d1-agent-repository.test.ts`

**Step 1: Write the failing repository tests**

Add tests for:
- storing publish artifacts in R2 under `agents/<namespace>/<name>/<version>/<path>`
- storing only metadata plus `r2_key` in D1
- resolving artifact download through R2 using the `r2_key`

**Step 2: Implement minimal persistence**

Add:
- D1 SQL that no longer expects inline content
- D1 repository wiring with injected artifact storage
- R2-backed read and write path for publish/download

**Step 3: Run verification**

Run:
- `npm test`
- `npm run typecheck`

Expected:
- PASS

### Task 5: Update docs and local helpers

**Files:**
- Modify: `README.md`
- Modify: `scripts/publish-sample-local.mjs`

**Step 1: Document the new storage behavior**

Add:
- artifact routes
- R2 storage layout
- note that D1 now stores metadata only

**Step 2: Run final verification**

Run:
- `npm test`
- `npm run typecheck`

Expected:
- PASS
