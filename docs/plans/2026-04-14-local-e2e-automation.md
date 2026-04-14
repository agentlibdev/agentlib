# Local E2E Automation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `npm run smoke:local` run the real local end-to-end flow: reset local state, start the local API, populate real demo agents, and execute the CLI smoke against a real package.

**Architecture:** Keep `agentlib` as the orchestration entrypoint. Reuse the existing local scripts instead of inventing a second path: `db:reset:local`, `dev:api:local`, `demo:populate:local`, and the existing `agent-cli/scripts/smoke-local.sh`. Add a small pure helper for path/env resolution so the orchestration is testable without spinning up Wrangler or Go in unit tests.

**Tech Stack:** Node.js scripts, TypeScript tests, Wrangler local dev, bash, Go CLI

### Task 1: Add testable orchestration helpers

**Files:**
- Create: `scripts/smoke-local-lib.mjs`
- Test: `apps/api/test/local-smoke-lib.test.ts`

**Step 1: Write the failing helper tests**

Cover:
- default sibling `agent-cli` directory resolution
- optional `AGENTLIB_CLI_DIR` override
- default smoke ref resolution
- default Go path/cache env enrichment for CLI smoke

**Step 2: Implement the minimal helper**

Keep the helper pure. No process spawning here.

### Task 2: Upgrade the local smoke entrypoint to real E2E

**Files:**
- Modify: `scripts/smoke-local.mjs`

**Step 1: Replace sample publish orchestration**

Change the flow to:
- reset local DB
- start local API
- wait for health
- populate demo data through authenticated HTTP publish
- run the CLI smoke against `raul/code-reviewer@0.3.0`

**Step 2: Make failures actionable**

Surface:
- missing sibling `agent-cli`
- missing CLI smoke script
- missing Go toolchain
- child process stderr

### Task 3: Update docs

**Files:**
- Modify: `README.md`
- Modify: `docs/local-development.md`

**Step 1: Update the smoke contract**

Document that `smoke:local` is now the true E2E path and requires:
- sibling `agent-cli` checkout
- local Go toolchain available at `$HOME/.local/go/bin/go` or via `AGENTLIB_GO_BIN_DIR`

**Step 2: Document overrides**

Record:
- `AGENTLIB_CLI_DIR`
- `AGENTLIB_SMOKE_REF`
- `AGENTLIB_GO_BIN_DIR`

### Task 4: Verify

**Files:**
- No additional files

**Step 1: Run tests first**

Run:

```bash
npm test
```

Expected:
- new helper test passes
- existing suite stays green

**Step 2: Run real E2E**

Run:

```bash
npm run smoke:local
```

Expected:
- local API is started and stopped automatically
- demo population succeeds
- CLI smoke ends with `smoke ok`
