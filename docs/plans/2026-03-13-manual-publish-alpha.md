# Manual Publish Alpha Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the first manual/local publish flow so the registry can accept a manifest payload, enforce immutable versions, persist metadata in D1, and expose the published result through read APIs.

**Architecture:** Keep the Worker thin and extend the existing repository abstraction with a write path dedicated to manual publish. Validate request payloads in the API layer, validate the manifest through a small validation package, and persist metadata plus inline artifact content in D1 as an MVP bridge before R2 exists.

**Tech Stack:** TypeScript, Cloudflare Workers, D1 SQL migrations, Node test runner

### Task 1: Define HTTP publish behavior in tests

**Files:**
- Modify: `apps/api/test/agents.test.ts`

**Step 1: Write the failing test**

Add tests for:
- `POST /api/v1/publish` returning `201` with the published identity
- invalid payload returning `400`
- duplicate `namespace/name@version` returning `409`
- published agent becoming visible through list/detail/version reads

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because the publish route and repository write path do not exist yet

### Task 2: Add domain types and validation

**Files:**
- Modify: `packages/core/src/agent-record.ts`
- Modify: `packages/core/src/agent-repository.ts`
- Create: `packages/validation/src/agent-schema.ts`
- Create: `packages/validation/src/validate-manifest.ts`

**Step 1: Write the minimal definitions**

Add:
- publish payload/result/artifact types
- repository write method for publishing a version
- manifest validation helper for `agentlib.dev/v1alpha1` / `kind: Agent`

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: FAIL until route/repository implementations catch up

### Task 3: Implement the publish route with an in-memory repository

**Files:**
- Modify: `apps/api/src/create-app.ts`
- Modify: `apps/api/src/in-memory-agent-repository.ts`

**Step 1: Write minimal implementation**

Add:
- JSON request parsing for `POST /api/v1/publish`
- explicit `400` payload errors
- manifest validation integration
- immutable conflict handling (`409`)
- in-memory persistence so route tests can pass

**Step 2: Run verification**

Run: `npm test`
Expected: PASS for route tests and FAIL only where D1 persistence is still missing

### Task 4: Persist publish data in D1

**Files:**
- Modify: `migrations/0001_initial.sql`
- Modify: `apps/api/src/d1-agent-repository.ts`
- Modify: `apps/api/test/d1-agent-repository.test.ts`

**Step 1: Write the failing repository tests**

Add tests for:
- inserting a new agent version
- rejecting an existing version
- storing artifact metadata plus inline content bridge fields

**Step 2: Implement minimal persistence**

Add:
- schema fields needed for inline artifact content bridge
- D1 transaction-like publish flow
- read model updates after publish

**Step 3: Run verification**

Run:
- `npm test`
- `npm run typecheck`

Expected:
- PASS

### Task 5: Update local tooling and docs

**Files:**
- Modify: `README.md`
- Modify: `package.json`
- Create: `scripts/publish-sample-local.mjs`

**Step 1: Document and script the local publish workflow**

Add:
- alpha payload contract
- local dev workflow for exercising publish
- sample publish helper script

**Step 2: Run final verification**

Run:
- `npm test`
- `npm run typecheck`

Expected:
- PASS
