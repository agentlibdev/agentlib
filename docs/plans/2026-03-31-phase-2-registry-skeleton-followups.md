# Phase 2 Registry Skeleton Follow-ups Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Record what is still worth salvaging from the legacy `phase-2-registry-skeleton` worktree before deleting it, and make the remaining work executable from `main`.

**Architecture:** Treat the old worktree as historical context, not as a branch to merge. Most of its commits landed later through different implementations and are now superseded by `main`. Only preserve follow-ups that still improve current local workflows without reverting newer web, auth, import, or docs slices.

**Tech Stack:** Markdown planning docs, Node.js local scripts, current `agentlib` publish API, `agent-examples` fixture packages

## What Is Already Absorbed Or Superseded

These old branch commits should **not** be replayed or merged directly into `main`:

- `493a9d7` `feat: bootstrap api health endpoint`
- `bc894a1` `feat: add registry read models and routes`
- `ec938c2` `feat: wire local d1 repository abstraction`
- `d415f33` `feat: add local d1 workflow and sample data`
- `3ddd703` `feat: add publish alpha and full read routes`
- `6c2a4aa` `feat: persist artifacts and verify local publish`
- `41b2704` `feat: validate publish manifests against schema`
- `8fbdf05` `feat: add artifact listing and download routes`

Reason:

- `main` already contains newer implementations of these capabilities.
- The old branch predates the current web app, auth/account flows, GitHub import, richer local demo population, runbooks, and current docs structure.
- A direct merge would mostly delete modern code and reintroduce obsolete assumptions.

## Candidate Follow-up 1: Generic Local Example Publisher

The old branch contained `scripts/publish-example-local.mjs`, which does **not** exist on `main`. The idea still has value, but it should be reintroduced as a fresh slice against current code, not copied blindly.

**Why it still matters:**

- `main` can publish a hard-coded sample request via `scripts/publish-sample-local.mjs`.
- `main` can also populate a richer demo via `scripts/populate-demo-local.mjs`.
- There is still no generic local helper that publishes a real example package directory from `agent-examples`.

### Task 1: Lock the current helper gap in tests or smoke docs

**Files:**
- Modify: `README.md`
- Modify: `docs/local-development.md`
- Create later if helpful: `apps/api/test/*.test.ts` only if API contract coverage is missing

**Step 1: Confirm the current workflow**

Document that current local publish helpers cover:

- `npm run publish:sample:local`
- `npm run populate:demo:local`

But do not yet cover:

- publishing an arbitrary example package directory from `agent-examples`

**Step 2: Decide the validation shape**

Prefer one of these two minimal options:

1. doc-only smoke verification for the helper
2. a focused script-level smoke command if the repo already has a stable place for that kind of check

Do **not** add broad new API tests if the helper only exercises existing endpoints.

### Task 2: Reintroduce a generic publisher helper against `main`

**Files:**
- Create: `scripts/publish-example-local.mjs`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/local-development.md`

**Step 1: Implement the helper**

Support:

- one example directory argument
- reading `agent.yaml`
- reading `README.md`
- optionally reading `agent.md`
- optionally reading `LICENSE`
- sending those files as publish artifacts to `POST /api/v1/publish`

Use the current local API wait helper pattern instead of inlining a separate health poller.

**Step 2: Keep scope narrow**

Do not add:

- recursive asset packaging
- semver range logic
- cross-repo discovery
- special example metadata conventions

The first useful slice is: "publish this one example directory locally".

**Step 3: Verify**

Run:

```bash
npm test
npm run typecheck
npm run dev:api:local
npm run publish:example:local -- ../agent-examples
```

Adjust the example path to the real package directory being exercised.

Expected:

- tests remain green
- typecheck passes
- local publish succeeds against the running Worker

### Task 3: Document the intended source of truth

**Files:**
- Modify: `README.md`
- Modify: `docs/local-development.md`

**Step 1: Explain when to use which helper**

Clarify:

- `publish:sample:local` is the fixed smoke fixture
- `populate:demo:local` is the richer multi-agent visual/demo seed
- `publish:example:local` is for publishing a real example package directory locally

## Candidate Follow-up 2: Decide Whether Local Schema Re-Export Is Still Needed

The old branch had a local `packages/validation/src/agent-schema.ts`. `main` now delegates manifest validation to `@agentlibdev/agent-schema` through `packages/validation/src/validate-manifest.ts`.

Current recommendation: **do nothing unless a concrete problem appears**.

Reasons:

- `main` already uses the dedicated schema package, which is the cleaner ownership boundary.
- Reintroducing a local schema copy would risk drift from `agent-schema`.
- There is no current evidence that `main` needs an embedded schema fallback.

If a future need appears, it should be framed explicitly as one of:

- offline/dev resilience when the schema package interface changes
- exposing the schema object for downstream tooling
- test fixtures that need a stable local schema export

That would require a new plan from `main`, not resurrection of the old branch file.

## Deletion Guidance

After preserving this note, the `phase-2-registry-skeleton` worktree can be deleted safely because:

- it has no uncommitted work
- its main product ideas are already present in newer form on `main`
- the only clearly reusable idea is the generic example publisher helper, now captured above as a fresh follow-up
