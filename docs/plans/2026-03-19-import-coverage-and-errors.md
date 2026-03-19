# Import Coverage And Errors Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand GitHub import drafts to include a slightly richer canonical file set and harden upstream error handling.

**Architecture:** Keep the current synchronous `import -> draft -> publish manual` flow and expand the provider snapshot only for canonical package files: `agent.yaml`, `README.md`, `agent.md`, and `LICENSE`. `agent.yaml` remains required; the other files are optional. Harden the GitHub provider client so route handlers can keep returning stable JSON errors for missing files, invalid manifests, rate limits, and generic upstream failures without changing public endpoint shapes.

**Tech Stack:** TypeScript, Cloudflare Workers, D1, Node test runner, Wrangler local dev

### Task 1: Add failing tests for broader import coverage

**Files:**
- Modify: `apps/api/test/agents.test.ts`
- Modify: `apps/api/test/d1-agent-repository.test.ts`

**Step 1: Write a failing route/repository expectation for imported draft snapshots that now include optional canonical files.**

Cover:
- `README.md`
- `agent.md` when present
- `LICENSE` when present

**Step 2: Run tests to verify the new expectations fail.**

Run: `npm test`
Expected: FAIL in import draft related tests.

### Task 2: Add failing tests for upstream error mapping

**Files:**
- Modify: `apps/api/test/agents.test.ts`
- Modify: `apps/api/test/d1-agent-repository.test.ts`

**Step 1: Add tests for:**
- `429` from GitHub becoming `github_rate_limited`
- non-404/non-429 upstream failures becoming `github_upstream_error`
- missing optional files not failing the import

**Step 2: Run tests to verify the new cases fail for the right reason.**

Run: `npm test`
Expected: FAIL in new GitHub import error tests.

### Task 3: Implement provider support for canonical optional files and hardened errors

**Files:**
- Modify: `packages/providers/src/github-client.ts`
- Modify: `packages/core/src/agent-record.ts`

**Step 1: Expand the GitHub package file fetch logic to include optional canonical files.**

Required:
- `agent.yaml`
- `README.md`

Optional:
- `agent.md`
- `LICENSE`

**Step 2: Preserve stable error semantics.**

Rules:
- missing `agent.yaml` => `manifest_not_found`
- invalid parsed manifest => `invalid_manifest`
- `429` => `github_rate_limited`
- other non-OK upstreams => `github_upstream_error`
- missing optional files do not fail the import

**Step 3: Run tests and make sure provider-related failures are green.**

Run: `npm test`
Expected: PASS for the new provider/import cases.

### Task 4: Persist and expose the richer draft snapshot

**Files:**
- Modify: `apps/api/src/d1-agent-repository.ts`
- Modify: `apps/api/src/in-memory-agent-repository.ts`

**Step 1: Store the expanded imported artifacts in the draft snapshot.**

**Step 2: Ensure publish-from-draft continues to publish from the stored snapshot, not a fresh provider fetch.**

**Step 3: Run tests again.**

Run: `npm test`
Expected: PASS.

### Task 5: Update docs and verify locally

**Files:**
- Modify: `README.md`
- Modify: `docs/local-development.md`

**Step 1: Document the broader canonical import coverage and the new upstream error code.**

**Step 2: Run verification commands.**

Run:

```bash
npm test
npm run typecheck
npm run import:github:local -- https://github.com/agentlibdev/agentlib main
```

Expected:
- tests pass
- typecheck passes
- helper returns a stable JSON error for repos without `agent.yaml`

### Task 6: Commit the slice

**Files:**
- Commit the tested changes above

**Step 1: Create a focused commit.**

Suggested message:

```bash
git commit -m "feat: broaden import draft coverage and upstream errors"
```
