# Schema Package And Unified Smoke Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn `agent-schema` into the single runtime source of truth for manifest validation and replace the fragmented local smoke flow in `agentlib` with one repeatable `smoke:local` command.

**Architecture:** Export a minimal runtime surface from `agent-schema` that includes the JSON schema and a reusable manifest validator helper. In `agentlib`, consume that package directly via a local dependency, delete the copied schema module, and wrap the existing local publish/list/download scripts behind one smoke orchestrator that manages reset, local dev, API checks, and assertions.

**Tech Stack:** TypeScript, Node.js, Cloudflare Workers, D1, R2, AJV, npm local file dependency, Wrangler local dev

### Task 1: Lock down reusable schema package behavior in `agent-schema`

**Files:**
- Create: `src/index.js`
- Create: `test/package-exports.test.mjs`
- Modify: `package.json`

**Step 1: Write the failing test**

Add tests that verify the package root exports:
- `agentSchema`
- `validateManifest`
- `parseManifestYaml`

Use one valid fixture and one invalid fixture from `examples/`.

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because the package has no runtime export surface yet.

### Task 2: Implement minimal runtime exports in `agent-schema`

**Files:**
- Create: `src/index.js`
- Modify: `package.json`

**Step 1: Write minimal implementation**

Add:
- schema loading from `schemas/agent.schema.json`
- `parseManifestYaml(source)` helper
- `validateManifest(manifest)` helper built on AJV 2020
- package `exports` for the root entrypoint

**Step 2: Run verification**

Run:
- `npm test`
- `npm run validate:fixtures`

Expected:
- PASS

### Task 3: Replace the local schema copy in `agentlib`

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `packages/validation/src/validate-manifest.ts`
- Delete: `packages/validation/src/agent-schema.ts`
- Modify: `apps/api/test/create-app.test.ts`
- Modify: `apps/api/test/d1-agent-repository.test.ts`

**Step 1: Write the failing test**

Add or adjust tests so publish validation still rejects an invalid manifest while importing `validateManifest` from the external package.

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL until `agentlib` consumes `@agentlibdev/agent-schema` directly.

**Step 3: Write minimal implementation**

Add:
- local dependency on `../agent-schema`
- external import in `packages/validation/src/validate-manifest.ts`
- removal of the copied schema module

**Step 4: Run verification**

Run:
- `npm test`
- `npm run typecheck`

Expected:
- PASS

### Task 4: Add a single `smoke:local` entrypoint in `agentlib`

**Files:**
- Modify: `package.json`
- Create: `scripts/smoke-local.mjs`
- Modify: `README.md`

**Step 1: Write the failing smoke test harness**

Add a script entrypoint that is expected to:
- reset local state
- launch `wrangler dev --local`
- wait for `/health`
- publish a sample version
- list artifacts
- download `README.md`
- assert expected output

**Step 2: Verify it fails before implementation**

Run: `npm run smoke:local`
Expected: FAIL because the new orchestrator does not exist yet.

**Step 3: Write minimal implementation**

Use the existing smoke scripts as subprocesses and keep assertions inside the new orchestrator script.

### Task 5: Run end-to-end verification and document outcomes

**Files:**
- Modify: `README.md`

**Step 1: Verify checks**

Run in `agent-schema`:
- `npm test`
- `npm run validate:fixtures`

Run in `agentlib`:
- `npm test`
- `npm run typecheck`
- `npm run smoke:local`

Expected:
- PASS
- README updated with the new dependency boundary and unified smoke command
