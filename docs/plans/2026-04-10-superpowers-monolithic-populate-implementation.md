# Superpowers Monolithic Populate Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add two demo commands that publish `obra/superpowers` as a single monolithic package, one from a local checkout and one from GitHub.

**Architecture:** Build a reusable local repository publish helper in `packages/core`, then layer two small scripts over it. The helper should model a monolithic repository snapshot package, so it remains suitable for repo-shaped entries like `agentskills/agentskills` as well as `obra/superpowers`. The local command will prepare a publish payload and post it directly. The GitHub command will clone the target repository to a temporary directory, reuse the same helper, and then publish that snapshot with demo auth headers.

**Tech Stack:** TypeScript, Node.js scripts, existing publish/import REST endpoints, Node test runner

### Task 1: Add the failing test for monolithic local repo payloads

**Files:**
- Create: `apps/api/test/local-repository-publish.test.ts`
- Reference: `packages/core/src/local-example-publish.ts`

**Step 1: Write the failing test**

Cover:

- reading a synthetic local repo with nested files
- skipping `.git` and `node_modules`
- emitting a manifest with the provided namespace/name/version/title/description
- keeping `README.md` as the publish `readme`
- attaching compatibility and provenance
- not requiring an existing `agent.yaml` in the source repo

**Step 2: Run test to verify it fails**

Run:

```bash
npm test
```

Expected: fail because the helper does not exist yet.

### Task 2: Implement the reusable local repository publish helper

**Files:**
- Create: `packages/core/src/local-repository-publish.ts`
- Modify: `packages/core/src/agent-record.ts` only if helper types need shared reuse

**Step 1: Write the minimal implementation**

Add:

- recursive artifact collection
- media type inference for common text files and JSON/YAML/Markdown
- skip rules for `.git`, `node_modules`, `.wrangler`, `dist`, `.next`, and temporary files
- output shape compatible with `POST /api/v1/publish`
- synthetic manifest generation for repository/spec packages that do not already provide `agent.yaml`

**Step 2: Run tests**

Run:

```bash
npm test
```

Expected: the new repository publish test passes.

### Task 3: Add local Superpowers populate command

**Files:**
- Create: `scripts/populate-superpowers-local.ts`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/local-development.md`

**Step 1: Implement command**

Behavior:

- usage: `npm run demo:populate:superpowers:local -- <repo-path> [version]`
- wait for local API health
- build payload with namespace/name fixed to `obra/superpowers`
- post to `/api/v1/publish` with demo owner headers
- treat `version_exists` as non-fatal for reruns

### Task 4: Add GitHub Superpowers populate command

**Files:**
- Create: `scripts/populate-superpowers-github.ts`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/local-development.md`

**Step 1: Implement command**

Behavior:

- usage: `npm run demo:populate:superpowers:github -- [repo-url] [ref] [version]`
- default repo URL: `https://github.com/obra/superpowers`
- clone the requested ref to a temporary directory
- build the same repository snapshot payload used by the local variant
- publish it directly with demo owner headers

### Task 5: Verify and document

**Files:**
- Modify: `README.md`
- Modify: `docs/local-development.md`

**Step 1: Run verification**

Run:

```bash
npm run typecheck
npm test
```

**Step 2: Summarize smoke path**

Document the recommended local sequence:

```bash
npm run db:reset:local
npm run dev:api:local
npm run demo:populate:superpowers:local -- /path/to/superpowers
```
