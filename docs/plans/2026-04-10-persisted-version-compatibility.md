# Persisted Version Compatibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persist version-level compatibility metadata during publish and allow owners to edit it from the registry web UI.

**Architecture:** Compatibility remains version-scoped and stored on `agent_versions` as JSON. Publish accepts an optional `compatibility` block, while post-publish editing is handled by a narrow `PATCH /api/v1/agents/:namespace/:name/versions/:version` endpoint that only updates compatibility for the version owner.

**Tech Stack:** TypeScript, Cloudflare Workers, D1 migrations, React, Node test runner

### Task 1: Fix the public contract

**Files:**
- Modify: `packages/core/src/agent-record.ts`
- Modify: `packages/core/src/agent-repository.ts`
- Modify: `apps/web/src/lib/types.ts`

**Step 1: Write failing API tests**

Add tests for:
- `POST /api/v1/publish` accepting `compatibility`
- `PATCH /api/v1/agents/:namespace/:name/versions/:version` updating compatibility

**Step 2: Add minimal request/response types**

Extend:
- `PublishRequest`
- version update input/result types
- repository method for updating version compatibility

Keep read-side parity intact by ensuring list/search and summary surfaces also expose the latest-version compatibility snapshot, so the web and CLI can rely on one compatibility contract.

### Task 2: Persist compatibility in repositories

**Files:**
- Modify: `apps/api/src/in-memory-agent-repository.ts`
- Modify: `apps/api/src/d1-agent-repository.ts`
- Modify: `migrations/0001_initial.sql`
- Create: `migrations/0003_agent_version_compatibility.sql`

**Step 1: Store compatibility on `agent_versions`**

Use `compatibility_json TEXT NOT NULL DEFAULT '{"targets":[]}'`.

**Step 2: Keep backward compatibility for demo rows**

Migration should backfill known seeded versions with the same demo compatibility previously returned by defaults.

### Task 3: Wire the API

**Files:**
- Modify: `apps/api/src/create-app.ts`
- Test: `apps/api/test/agents.test.ts`

**Step 1: Validate incoming compatibility**

Only accept arrays of target records with:
- `targetId`
- `builtFor`
- `tested`
- `adapterAvailable`

**Step 2: Add the PATCH route**

Implement:

```text
PATCH /api/v1/agents/:namespace/:name/versions/:version
```

Body:

```json
{
  "compatibility": {
    "targets": []
  }
}
```

### Task 4: Add web editing

**Files:**
- Create: `apps/web/src/components/compatibility-editor.tsx`
- Create: `apps/web/src/lib/compatibility-targets.ts`
- Modify: `apps/web/src/lib/api.ts`
- Modify: `apps/web/src/lib/manual-publish.ts`
- Modify: `apps/web/src/routes/manual-publish-page.tsx`
- Modify: `apps/web/src/routes/version-page.tsx`
- Modify: `apps/web/src/app.tsx`
- Test: `apps/web/test/manual-publish.test.ts`

**Step 1: Add a shared target catalog**

Keep the first list aligned with CLI built-ins:
- codex
- claude-code
- github-copilot
- gemini-cli
- opencode
- cursor
- antigravity
- windsurf
- vscode
- openclaw
- crewai
- langchain

**Step 2: Add editor UI**

- manual publish page: choose compatibility before publish
- version page: owner-only editor for existing versions

### Task 5: Verify and update notes

**Files:**
- Modify: `docs/plans/2026-04-10-compatibility-contract-and-badges.md`

**Step 1: Run verification**

Run:

```bash
npm test
npm run typecheck
npm run build:web
```

**Step 2: Update docs**

Record that compatibility is now:
- persisted on publish
- editable by version owners
- still separate from immutable artifacts
