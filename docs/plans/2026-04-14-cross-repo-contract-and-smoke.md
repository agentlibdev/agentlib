# Cross-Repo Contract And Smoke Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep `agentlib` and `agent-cli` aligned by exposing compatibility metadata consistently in read APIs and by adding reproducible smoke coverage against real packages and lifecycle commands.

**Architecture:** Treat registry compatibility as canonical metadata owned by `agentlib`, then consume that metadata in `agent-cli` without inventing a second target model. Keep this slice incremental: no publish-model rewrite, no new runtime abstraction, only read-contract tightening, docs, and executable smoke coverage.

**Tech Stack:** TypeScript, React, Cloudflare Workers/D1, Go, Docker Compose, Go tests.

### Task 1: Document the contract delta in `agentlib`

**Files:**
- Modify: `docs/plans/2026-04-10-compatibility-contract-and-badges.md`
- Modify: `docs/plans/2026-04-10-persisted-version-compatibility.md`
- Create: `docs/plans/2026-04-14-cross-repo-contract-and-smoke.md`

**Step 1: Document the new read-contract scope**

Record that `compatibility` must appear on:
- `GET /api/v1/agents`
- account-owned agent summaries
- registry highlights/top agents
- existing detail/version endpoints

**Step 2: Document target-id ownership**

State that target ids remain registry-owned and shared with CLI/runtime adapters. Current ids must stay stable across repos unless an explicit rename plan is approved.

### Task 2: Add compatibility to list/read surfaces in `agentlib`

**Files:**
- Modify: `packages/core/src/agent-record.ts`
- Modify: `apps/web/src/lib/types.ts`
- Modify: `apps/api/src/d1-agent-repository.ts`
- Modify: `apps/api/src/in-memory-agent-repository.ts`
- Test: `apps/api/test/agents.test.ts`
- Test: `apps/api/test/d1-agent-repository.test.ts`

**Step 1: Write or update failing expectations**

Add test coverage proving that list endpoints and summary surfaces expose `compatibility.targets`.

**Step 2: Implement minimal read-contract change**

Extend `AgentListItem` with `compatibility`, source it from latest-version compatibility in both repository implementations, and keep default parsing behavior unchanged for missing legacy rows.

**Step 3: Run targeted verification**

Run the relevant API tests and type checks until green.

### Task 3: Tighten the CLI contract and smoke path

**Files:**
- Modify: `/home/raul/agentlibdev/agent-cli/README.md`
- Modify: `/home/raul/agentlibdev/agent-cli/docs/plans/2026-04-02-target-adapters-and-custom-targets-design.md`
- Modify: `/home/raul/agentlibdev/agent-cli/internal/...` only if a real contract gap appears
- Create or modify: smoke script/docs under `/home/raul/agentlibdev/agent-cli`

**Step 1: Lock the expected install/activate/deactivate/remove flow**

Document how to point the CLI to local API, how global vs local install roots behave, and how runtime activation should be exercised against a real published package.

**Step 2: Add reproducible smoke coverage**

Create or update a reproducible flow that validates:
- search
- install from local registry
- activation state visibility
- deactivation
- remove cleanup

**Step 3: Run the smoke flow against local API**

Use the existing local populate/reset commands and a real package fixture.

### Task 4: Verify, commit, and push in scoped increments

**Files:**
- No new files beyond the implementation artifacts above.

**Step 1: Verify `agentlib`**

Run targeted tests and type checks.

**Step 2: Verify `agent-cli`**

Run Go tests and the local smoke flow.

**Step 3: Commit and push each repo separately**

Keep commit scopes clear:
- `agentlib`: contract + docs
- `agent-cli`: smoke/docs or lifecycle code if needed
