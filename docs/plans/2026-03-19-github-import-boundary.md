# GitHub Import Boundary Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the first provider import boundary for public GitHub repositories so AgentLib can fetch `agent.yaml`, validate it, and persist normalized source repository metadata without yet turning import into full publish orchestration.

**Architecture:** Keep GitHub-specific fetch logic behind a small provider client boundary and keep the API route thin. The first slice should synchronously fetch repository metadata plus `agent.yaml`, validate the manifest with `@agentlibdev/agent-schema`, and upsert a `source_repositories` record in D1 while returning an import preview response.

**Tech Stack:** TypeScript, Cloudflare Workers, D1, fetch API, Node test runner, local Wrangler

## Proposed public contract for approval

### Request

`POST /api/v1/providers/github/import`

```json
{
  "repositoryUrl": "https://github.com/owner/repo",
  "ref": "main"
}
```

Notes:

- `repositoryUrl` required
- `ref` optional; if absent, resolve the repository default branch

### Success response

`200 OK`

```json
{
  "import": {
    "provider": "github",
    "repository": {
      "externalId": "123456",
      "url": "https://github.com/owner/repo",
      "owner": "owner",
      "name": "repo",
      "defaultBranch": "main",
      "resolvedRef": "main"
    },
    "manifest": {
      "namespace": "raul",
      "name": "code-reviewer",
      "version": "0.4.0",
      "title": "Code Reviewer",
      "description": "Reviews pull requests for correctness and maintainability."
    },
    "sourceRepositoryId": "source_repo_github_123456"
  }
}
```

### Error model

- `400 invalid_import_request`
- `400 unsupported_repository_url`
- `404 repository_not_found`
- `404 manifest_not_found`
- `422 invalid_manifest`
- `502 github_upstream_error`

## Alternatives considered

1. Full import-to-publish in one route.
Rejected for this slice because it couples provider fetch, validation, persistence, and publish orchestration too early.

2. Accept `owner`, `repo`, and `ref` instead of a GitHub URL.
Cleaner internally, but worse UX for the first user-facing import boundary and less aligned with future CLI/web inputs.

3. Async import via Queues/Workflows from day one.
Likely the eventual direction, but too heavy for the first provider slice.

## Task 1: Add provider-domain types and repository contract

**Files:**
- Create: `packages/providers/src/github-import.ts`
- Modify: `packages/core/src/agent-repository.ts`
- Modify: `packages/core/src/agent-record.ts`
- Test: `apps/api/test/agents.test.ts`

**Step 1: Write the failing test**

Add route-level tests for:
- valid import request returning a normalized preview payload
- invalid request shape returning `400`
- schema-invalid manifest returning `422`

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because the route and repository contract do not exist yet.

## Task 2: Add GitHub import route shape

**Files:**
- Modify: `apps/api/src/create-app.ts`
- Modify: `apps/api/test/agents.test.ts`

**Step 1: Write minimal implementation**

Add:
- request shape validation for `repositoryUrl` and optional `ref`
- explicit error mapping
- repository call to `importGithubRepository`

**Step 2: Run verification**

Run: `npm test`
Expected: route tests pass, existing route tests remain green.

## Task 3: Add provider client abstraction and in-memory stub

**Files:**
- Create: `packages/providers/src/github-client.ts`
- Modify: `apps/api/src/create-repository.ts`
- Modify: `apps/api/src/in-memory-agent-repository.ts`
- Test: `apps/api/test/agents.test.ts`

**Step 1: Write the failing test**

Add tests showing:
- URL normalization
- default-branch resolution behavior
- preview mapping into the API response

**Step 2: Implement minimal code**

Keep the first provider client surface small:
- `getRepository(repositoryUrl)`
- `getManifest(repository, ref)`

## Task 4: Persist source repository metadata in D1

**Files:**
- Modify: `apps/api/src/d1-agent-repository.ts`
- Test: `apps/api/test/d1-agent-repository.test.ts`

**Step 1: Write the failing test**

Add tests for:
- upserting a GitHub source repository record
- returning the normalized import preview payload
- mapping invalid manifest to a repository-layer error

**Step 2: Implement minimal code**

Use existing `providers` and `source_repositories` tables.
Do not create a publish record yet.

## Task 5: Add real GitHub fetch integration for public repos

**Files:**
- Modify: `packages/providers/src/github-client.ts`
- Modify: `apps/api/src/create-repository.ts`
- Possibly modify: `apps/api/src/env.ts`

**Step 1: Implement the smallest working fetch path**

Use public GitHub HTTP endpoints to:
- resolve repo metadata
- determine default branch if `ref` omitted
- fetch `agent.yaml`

Keep auth out of this slice unless required.

## Task 6: Update docs and verify locally

**Files:**
- Modify: `README.md`
- Possibly create: `scripts/import-github-local.mjs`

**Step 1: Verification**

Run:
- `npm test`
- `npm run typecheck`
- `npm run smoke:local`

Optional follow-up if implemented in this slice:
- `npm run import:github:local -- <repo-url> [ref]`

Expected:
- all existing checks remain green
- import route returns preview payload for a valid public repo
