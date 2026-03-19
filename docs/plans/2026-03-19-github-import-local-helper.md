# GitHub Import Local Helper Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a small local helper command that exercises `POST /api/v1/providers/github/import` against Wrangler local dev.

**Architecture:** Keep the helper symmetrical with the existing local publish/list/download scripts. The new script should wait for `/health`, accept `repositoryUrl` and optional `ref`, call the local import endpoint, and print the API response body so contributors can inspect the created draft. This slice should stay script-only and avoid changing the API contract.

**Tech Stack:** Node.js, fetch, existing local script helpers, npm scripts, Wrangler local dev

### Task 1: Add the local helper script

**Files:**
- Create: `scripts/import-github-local.mjs`
- Reuse: `scripts/_local-api.mjs`

**Step 1:** Implement a script that:
- waits for local API health
- reads `repositoryUrl` from argv position 2
- reads optional `ref` from argv position 3
- posts JSON to `/api/v1/providers/github/import`
- prints the raw response body
- exits non-zero on non-2xx responses or missing `repositoryUrl`

**Step 2:** Keep the request payload minimal:

```json
{
  "repositoryUrl": "https://github.com/owner/repo",
  "ref": "main"
}
```

### Task 2: Expose the helper in package scripts

**Files:**
- Modify: `package.json`

**Step 1:** Add:

```json
"import:github:local": "node scripts/import-github-local.mjs"
```

### Task 3: Document the helper

**Files:**
- Modify: `README.md`
- Modify: `docs/local-development.md`

**Step 1:** Add the command to the local development workflow sections.

**Step 2:** Show one example invocation with a public GitHub URL.

### Task 4: Verify locally

**Files:**
- No new files

**Step 1:** Run:

```bash
npm run typecheck
```

**Step 2:** Start local API and run:

```bash
npm run import:github:local -- https://github.com/owner/repo main
```

**Expected:** JSON response with an `import` object or a stable upstream error from the current API contract.

**Note:** This slice is script-only. The current automated test runner covers `apps/**/*.ts` but not Node helper scripts, so verification is done with fresh local execution rather than a new unit test.
