# Compatibility Contract And Badges Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expose stable compatibility metadata from the registry API and render `Built for`, `Tested with`, and `Adapter available` badges on agent and version detail pages.

**Architecture:** Compatibility is version-first and represented as a `targets[]` collection where each target carries three explicit booleans. Agent detail exposes the same shape as a latest-version snapshot. This first slice keeps persistence simple by using server-side defaults for demo agents and empty compatibility for everything else.

**Tech Stack:** TypeScript, Cloudflare Workers API handlers, shared core types, React web app, Node test runner

### Task 1: Define the compatibility contract

**Files:**
- Create: `packages/core/src/agent-compatibility.ts`
- Modify: `packages/core/src/agent-record.ts`

**Step 1: Add the failing API tests first**

Use the existing API tests to assert that both agent detail and version detail responses include:

```ts
compatibility: {
  targets: [
    {
      targetId: "codex",
      builtFor: true,
      tested: true,
      adapterAvailable: true
    }
  ]
}
```

**Step 2: Add shared compatibility types**

Define:

```ts
export type AgentTargetCompatibility = {
  targetId: string;
  builtFor: boolean;
  tested: boolean;
  adapterAvailable: boolean;
};

export type AgentCompatibility = {
  targets: AgentTargetCompatibility[];
};
```

Add `compatibility` to `AgentDetail` and `AgentVersionDetail`.

### Task 2: Add server-side compatibility defaults

**Files:**
- Create: `packages/core/src/agent-compatibility.ts`
- Modify: `apps/api/src/in-memory-agent-repository.ts`
- Modify: `apps/api/src/d1-agent-repository.ts`

**Step 1: Add a small helper**

Expose helpers for:
- empty compatibility
- seeded demo compatibility for known demo agents such as `raul/code-reviewer` and `acme/support-triager`

Keep this thin and explicit. Do not add persistence in this slice.

**Step 2: Wire repository responses**

Both repositories should return a `compatibility` object on:
- agent detail
- version detail

Newly published agents should default to empty compatibility.

### Task 3: Serialize the contract through the API

**Files:**
- Modify: `apps/api/src/create-app.ts`
- Test: `apps/api/test/agents.test.ts`

**Step 1: Update JSON responses**

Include `compatibility` in:
- `GET /api/v1/agents/:namespace/:name`
- `GET /api/v1/agents/:namespace/:name/versions/:version`

**Step 2: Run the targeted tests**

Run:

```bash
npm test -- agents.test.ts
```

Expected: API compatibility assertions pass.

### Task 4: Render grouped badges in the web app

**Files:**
- Create: `apps/web/src/components/compatibility-badges.tsx`
- Modify: `apps/web/src/lib/types.ts`
- Modify: `apps/web/src/routes/agent-page.tsx`
- Modify: `apps/web/src/routes/version-page.tsx`

**Step 1: Add frontend types**

Mirror the shared response shape:

```ts
compatibility: {
  targets: AgentTargetCompatibility[];
}
```

**Step 2: Add a reusable badge block**

Render only non-empty groups:
- `Built for`
- `Tested with`
- `Adapter available`

Map internal target ids to readable labels such as `Claude Code`, `Gemini CLI`, `CrewAI`, `LangChain`.

**Step 3: Place the block**

- Agent detail: near the hero metadata and lifecycle chips
- Version detail: inside `Package info`

### Task 5: Verify and document residual scope

**Files:**
- Modify: `docs/plans/2026-04-02-web-compatibility-badges-followup.md`

**Step 1: Run full verification**

Run:

```bash
npm test
npm run typecheck
npm run build:web
```

Expected:
- all tests pass
- typecheck passes
- web build passes

**Step 2: Update the earlier follow-up note**

Record that:
- the API contract is now `compatibility.targets[]`
- the current slice uses server-side defaults for demo data
- publish-time editing and persistence remain follow-up work
