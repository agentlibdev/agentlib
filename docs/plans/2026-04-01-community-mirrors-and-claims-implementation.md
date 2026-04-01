# Community Mirrors And Claims Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add first-class support for community-mirrored skills and later upstream ownership claims without confusing unofficial uploads with official packages.

**Architecture:** Introduce provenance and authority metadata at the package identity layer, expose that state through the existing REST APIs, and surface clear trust badges in the web UI. Roll out in small slices: data model first, then read APIs, then upload rules, then claim flow.

**Tech Stack:** TypeScript, Cloudflare Workers, D1, React

### Task 1: Add provenance and authority fields to the data model

**Files:**
- Modify: `migrations/0001_initial.sql`
- Modify: `packages/core/src/agent-record.ts`
- Modify: `packages/core/src/agent-repository.ts`
- Modify: `apps/api/src/d1-agent-repository.ts`
- Modify: `apps/api/src/in-memory-agent-repository.ts`
- Test: `apps/api/test/*.test.ts`

**Step 1:** Add package-level fields for `namespaceType`, `authorityStatus`, canonical linkage, and claim metadata.

**Step 2:** Add version/source provenance fields for original author, source platform, source URL, and submitter identity.

**Step 3:** Update repository read/write types and test fixtures.

**Step 4:** Run `npm run typecheck` and `npm test`.

### Task 2: Expose provenance through public read APIs

**Files:**
- Modify: `apps/api/src/create-app.ts`
- Modify: `apps/api/src/d1-agent-repository.ts`
- Modify: `apps/api/src/in-memory-agent-repository.ts`
- Modify: `apps/web/src/lib/types.ts`
- Test: `apps/api/test/agents.test.ts`

**Step 1:** Extend agent detail/version responses with provenance and authority metadata.

**Step 2:** Keep response shapes explicit and stable; avoid overloading existing fields.

**Step 3:** Add tests covering `official`, `community_mirror`, and `claimed_by_upstream` states.

### Task 3: Add community mirror submission rules

**Files:**
- Modify: `apps/api/src/create-app.ts`
- Modify: `packages/core/src/agent-record.ts`
- Modify: `apps/web/src/routes/manual-publish-page.tsx`
- Modify: `apps/web/src/lib/types.ts`
- Test: `apps/api/test/agents.test.ts`

**Step 1:** Add explicit publish payload fields for source/provenance.

**Step 2:** Enforce that community mirrors cannot publish into reserved or official namespaces.

**Step 3:** Require `sourceUrl` and `originalAuthorName` for mirror submissions.

**Step 4:** Add clear validation errors and update publish UI copy.

### Task 4: Show trust state in the web UI

**Files:**
- Modify: `apps/web/src/routes/home-page.tsx`
- Modify: `apps/web/src/routes/agent-page.tsx`
- Modify: `apps/web/src/routes/version-page.tsx`
- Modify: `apps/web/src/styles.css`
- Test: `apps/web/test/*.test.ts`

**Step 1:** Add compact trust badges: `Official`, `Community Mirror`, `Claimed By Upstream`.

**Step 2:** Add a provenance card to package pages with original author, source URL, and submitter.

**Step 3:** Prefer official packages in ranking or at least visually distinguish them.

### Task 5: Add claim requests and claim resolution

**Files:**
- Modify: `packages/core/src/agent-record.ts`
- Modify: `packages/core/src/agent-repository.ts`
- Modify: `apps/api/src/create-app.ts`
- Modify: `apps/api/src/d1-agent-repository.ts`
- Modify: `apps/web/src/routes/account-page.tsx`
- Create: `apps/web/src/routes/claim-page.tsx` or claim controls under account/admin
- Test: `apps/api/test/account.test.ts`

**Step 1:** Add a claim request object and storage.

**Step 2:** Add a submit-claim endpoint with evidence fields.

**Step 3:** Add an admin or moderation-only resolution path that marks mirrors as claimed and links canonical packages.

**Step 4:** Keep mirror history visible but secondary after claim approval.

### Task 6: Documentation and policy

**Files:**
- Modify: `README.md`
- Modify: `docs/local-development.md`
- Modify: `docs/plans/2026-04-01-community-mirrors-and-claims-design.md`
- Create or modify: `docs/runbooks/*`

**Step 1:** Document reserved namespaces and mirror policy.

**Step 2:** Document acceptable claim evidence.

**Step 3:** Document moderation handling for disputed mirrors.
