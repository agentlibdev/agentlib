# Artifact Viewer And Bundle Download Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an internal artifact viewer for registry package files and a one-click ZIP download for all assets in a published version.

**Architecture:** Extend the API with two read-focused endpoints: one for textual artifact preview metadata/content and one for a generated ZIP bundle per agent version. Keep direct artifact download behavior intact. In the web app, add a version-scoped artifact viewer route that renders Markdown and pretty-printed JSON internally, with download controls for both the single file and the full package ZIP.

**Tech Stack:** TypeScript, Cloudflare Workers, React, Tailwind CSS

### Task 1: Extend artifact read capabilities in the API

**Files:**
- Modify: `packages/core/src/agent-repository.ts`
- Modify: `apps/api/src/create-app.ts`
- Modify: `apps/api/src/d1-agent-repository.ts`
- Modify: `apps/api/src/in-memory-agent-repository.ts`
- Test: `apps/api/test/agents.test.ts`

**Step 1:** Add repository support to fetch all artifact contents for a version.

**Step 2:** Add a preview endpoint returning text content for text-safe artifacts only.

**Step 3:** Add a ZIP download endpoint for a full version bundle.

**Step 4:** Cover 404s, unsupported binary previews, and content headers in tests.

### Task 2: Add the artifact viewer route in the frontend worktree

**Files:**
- Modify: `.worktrees/ui-ux-refresh/apps/web/src/lib/router.ts`
- Modify: `.worktrees/ui-ux-refresh/apps/web/test/router.test.ts`
- Modify: `.worktrees/ui-ux-refresh/apps/web/src/lib/api.ts`
- Modify: `.worktrees/ui-ux-refresh/apps/web/src/lib/types.ts`
- Create: `.worktrees/ui-ux-refresh/apps/web/src/routes/artifact-page.tsx`
- Modify: `.worktrees/ui-ux-refresh/apps/web/src/app.tsx`
- Modify: `.worktrees/ui-ux-refresh/apps/web/src/routes/version-page.tsx`

**Step 1:** Add a version artifact route and helpers.

**Step 2:** Fetch preview payloads and render Markdown / JSON / plain text with internal controls.

**Step 3:** Add direct file download and bundle ZIP download buttons on the version page and viewer page.

### Task 3: Style and verify the viewer

**Files:**
- Modify: `.worktrees/ui-ux-refresh/apps/web/src/styles.css`
- Test: `.worktrees/ui-ux-refresh/apps/web/test/*.test.ts`

**Step 1:** Add viewer styles that fit the current Bolt-like worktree direction.

**Step 2:** Verify build and typecheck in the worktree plus API tests in `main`.
