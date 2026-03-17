# Local Smoke And SHA256 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace placeholder artifact checksums with real SHA-256 values and add repeatable local smoke scripts that exercise publish, artifact listing, and artifact download against the local Worker/D1/R2 stack.

**Architecture:** Keep the current publish API unchanged and compute the artifact digest inside the D1 repository publish flow from the decoded artifact bytes before persisting metadata. Add small Node-based smoke scripts that talk to the local API over HTTP so the full path is verifiable without introducing test-only server code.

**Tech Stack:** TypeScript, Cloudflare Workers, D1, R2, Node test runner, local Wrangler dev

### Task 1: Define checksum behavior in repository tests

**Files:**
- Modify: `apps/api/test/d1-agent-repository.test.ts`

**Step 1: Write the failing test**

Add tests for:
- storing a real SHA-256 digest instead of a placeholder during publish
- keeping the deterministic `r2_key` unchanged

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because the repository still writes `"pending"` to `artifacts.sha256`

### Task 2: Implement SHA-256 generation

**Files:**
- Modify: `apps/api/src/d1-agent-repository.ts`

**Step 1: Write minimal implementation**

Add:
- SHA-256 digest generation from decoded artifact bytes
- hex encoding helper
- artifact metadata creation that returns the real digest

**Step 2: Run verification**

Run:
- `npm test`
- `npm run typecheck`

Expected:
- PASS

### Task 3: Add local smoke scripts for artifact flows

**Files:**
- Modify: `package.json`
- Modify: `scripts/publish-sample-local.mjs`
- Create: `scripts/list-artifacts-local.mjs`
- Create: `scripts/download-artifact-local.mjs`

**Step 1: Write the failing smoke entrypoints**

Add scripts for:
- listing artifact metadata from the local API
- downloading one artifact from the local API

**Step 2: Verify they fail without the new files wired**

Run:
- `npm run list:artifacts:local`
- `npm run download:artifact:local`

Expected:
- FAIL until the scripts are added

**Step 3: Implement minimal smoke scripts**

Add:
- shared local health wait behavior
- JSON output for artifact list
- text/binary-safe download output to stdout or a temp file path

### Task 4: Update docs with the smoke workflow

**Files:**
- Modify: `README.md`

**Step 1: Document the local end-to-end path**

Add:
- the new smoke commands
- expected sequence for local verification
- note that `sha256` is now a real digest

### Task 5: Run final verification

**Files:**
- No code changes expected

**Step 1: Verify unit checks**

Run:
- `npm test`
- `npm run typecheck`

Expected:
- PASS

**Step 2: Verify local smoke flow**

Run:
- `npm run d1:reset:local`
- `npm run dev:api:local`
- `npm run publish:sample:local -- 0.3.1`
- `npm run list:artifacts:local -- raul code-reviewer 0.3.1`
- `npm run download:artifact:local -- raul code-reviewer 0.3.1 README.md`

Expected:
- published version visible
- artifact metadata returned from the API
- artifact content downloaded successfully
