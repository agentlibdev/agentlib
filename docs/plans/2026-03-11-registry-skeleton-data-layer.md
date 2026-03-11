# Registry Skeleton Data Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the first D1 schema, provider seed data, and read-only agent endpoints for the AgentLib registry skeleton.

**Architecture:** Keep the Worker thin and route requests through a small repository abstraction. Store the initial D1 schema as SQL migrations, but test the API behavior against an in-memory repository so route behavior can move independently from database wiring.

**Tech Stack:** TypeScript, Cloudflare Workers, D1 SQL migrations, Node test runner

### Task 1: Define route behavior in tests

**Files:**
- Modify: `apps/api/test/health.test.ts`
- Create: `apps/api/test/agents.test.ts`

**Step 1: Write the failing test**

Add tests for:
- `GET /api/v1/agents` returning a paginated list shape
- `GET /api/v1/agents/:namespace/:name` returning one agent detail
- unknown agent detail returning JSON 404

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because repository-backed routes do not exist yet

### Task 2: Add the initial persistence shape

**Files:**
- Create: `migrations/0001_initial.sql`
- Create: `migrations/seed/0001_providers.sql`
- Create: `packages/core/src/agent-record.ts`
- Create: `packages/core/src/agent-repository.ts`

**Step 1: Write the minimal definitions**

Add:
- table creation SQL for `agents`, `agent_versions`, `artifacts`, `providers`, `source_repositories`
- provider seed inserts for `manual`, `github`, `gitlab`, `bitbucket`
- shared TypeScript types for list/detail responses
- repository interface for list/detail reads

### Task 3: Implement route handlers

**Files:**
- Modify: `apps/api/src/index.ts`
- Create: `apps/api/src/create-app.ts`
- Create: `apps/api/src/in-memory-agent-repository.ts`

**Step 1: Write minimal implementation**

Add:
- app factory with injected repository
- list/detail endpoints
- JSON 404 for unknown agent
- small in-memory repository for tests and bootstrap behavior

**Step 2: Run verification**

Run:
- `npm test`
- `npm run typecheck`

Expected:
- PASS

### Task 4: Update bootstrap docs

**Files:**
- Modify: `README.md`

**Step 1: Document what now exists**

Add:
- D1 entities
- provider seed data
- read-only endpoints now available
- note that actual D1 query wiring is the next step
