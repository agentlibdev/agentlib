# Community Mirrors And Claims Design

## Problem

AgentLib needs a way to index high-quality skills that were not originally published by the uploader. This is especially important for ecosystem-specific skills such as Claude, Codex, OpenCode, or OpenClaw skills that are useful to discover centrally even when the original author has not published them directly to AgentLib.

If AgentLib simply allows third parties to publish these skills under a generic system-owned namespace, the registry creates three problems:

1. It blurs authorship and makes unofficial mirrors look official.
2. It makes future ownership claims messy because the canonical identity is already occupied.
3. It creates moderation and trust issues because users cannot distinguish "official upstream", "community mirror", and "platform-maintained package".

The system therefore needs a way to:

- allow discovery of third-party or externally-originated skills
- preserve provenance and attribution
- clearly separate uploader identity from original author identity
- support later authority claims by the upstream owner
- promote official ownership without destroying useful mirrored history

## Recommended Approach

Use two namespace classes and an explicit claim model.

### Namespace Classes

1. **Official namespaces**
   These belong to verified owners and are the canonical location for upstream packages.

   Examples:
   - `openai/codex-tools`
   - `anthropic/claude-review-skills`
   - `openclaw/openclaw-prompts`

2. **Community mirror namespaces**
   These exist for packages submitted by someone other than the original author.

   Recommended reserved prefixes:
   - `mirrors/...`
   - `community/...`

   Examples:
   - `mirrors/openai-codex-tools`
   - `community/anthropic-claude-review-skills`

The mirror namespace should never imply official endorsement. It is explicitly a discovery and preservation mechanism.

### Provenance Model

Every mirrored submission should carry structured provenance:

- `submittedByUserId`
- `submittedByHandle`
- `originalAuthorName`
- `originalAuthorUrl`
- `originalPlatform`
- `sourceType`
  Values:
  - `github`
  - `gitlab`
  - `website`
  - `gist`
  - `manual`
- `sourceUrl`
- `sourceVerified`
- `authorityStatus`
  Values:
  - `unofficial`
  - `verified_mirror`
  - `claimed_by_upstream`
  - `official`

This keeps uploader, origin, and authority separate.

## Alternatives Considered

### Option A: Put everything unofficial under a system profile

Example:
- `agentlib/claude-skills`
- `agentlib/codex-skills`

Pros:
- simple to implement
- centralizes imported content

Cons:
- bad trust model
- looks platform-endorsed by default
- awkward when upstream later appears
- creates governance debt fast

This is the wrong default.

### Option B: Let any uploader publish directly under the upstream-looking namespace

Example:
- a random user publishes under `openai/...`

Pros:
- clean URLs

Cons:
- namespace squatting
- brand abuse
- expensive moderation
- painful later migration

This is unacceptable without strong prior verification.

### Option C: Official + mirror namespaces with claim flow

Pros:
- preserves discovery
- preserves attribution
- allows later canonical takeover
- scales better for moderation and UX

Cons:
- requires more metadata
- introduces some UI and policy complexity

This is the recommended option.

## Claim Flow

Claiming should be explicit and evidence-based.

### Claim Preconditions

An upstream claimant must authenticate and prove control of the origin. Acceptable proofs can include:

- repository verification file in the upstream repo
- signed tag or signed commit in the referenced source
- link-back from official project website
- DNS TXT verification for an organizational domain
- provider-based verification from a connected GitHub/GitLab org

### Claim Resolution

When a claim is approved:

1. Create or verify the official namespace owner.
2. Mark the mirrored package as `claimed_by_upstream`.
3. Publish the canonical package under the official namespace.
4. Keep the mirror page reachable but visibly secondary.
5. Add a redirect or canonical link to the official package.
6. Freeze further mirror releases unless moderation explicitly allows them.

This avoids deleting useful history while making official ownership obvious.

## Registry UX

The UI needs very clear provenance badges.

Recommended labels:

- `Official`
- `Claimed By Upstream`
- `Verified Mirror`
- `Community Mirror`

Recommended page sections:

- header badge
- source attribution card
- original author block
- submitted by block
- claim status block

For mirrors, the package page should show a warning-style note:

"This package is a community mirror of externally authored work. It is not currently the official upstream publication on AgentLib."

For claimed mirrors:

"This package has been claimed by the upstream owner. The canonical package now lives at `official-namespace/package-name`."

## Data Model Direction

This can be introduced without changing the core immutable version principle.

Suggested additions:

### Package-level fields

- `namespaceType`
  Values:
  - `official`
  - `community_mirror`
  - `platform`
- `authorityStatus`
- `canonicalAgentId`
- `claimedByUserId`
- `claimedAt`

### Version-level fields

- `sourceUrl`
- `sourceType`
- `originalAuthorName`
- `originalAuthorUrl`
- `submittedByUserId`
- `submissionNotes`

These should be mostly append-only after publication, except for claim metadata which belongs to the package identity layer.

## Moderation Rules

Minimum guardrails:

- community mirrors must include a source URL
- reserved brand namespaces cannot be claimed by arbitrary users
- mirrors cannot use the upstream brand namespace directly
- mirrors with DMCA or abuse complaints can be hidden while preserving audit history
- official claims require human-reviewable evidence even if some checks are automated

## Recommended Product Policy

AgentLib should default to:

- discoverability over exclusivity
- attribution over convenience
- claimability over permanent mirror ownership

The platform should allow useful mirrors, but never pretend they are official unless proven.

## Rollout Strategy

### Phase 1

- support community mirror uploads
- show provenance fields and mirror badges
- reserve official namespaces

### Phase 2

- add claim requests and moderation tooling
- add canonical redirects from claimed mirrors

### Phase 3

- provider-backed automated verification for organizations
- search ranking preference for official and claimed canonical packages

## Recommendation

Do not use a generic system profile for externally-authored ecosystem skills except for content that AgentLib itself truly maintains.

Instead:

- use official namespaces for verified upstream owners
- use `mirrors/` or `community/` namespaces for third-party submissions
- attach explicit provenance metadata
- support later upstream claims with strong verification
- preserve mirrors as secondary historical entries once claimed

This gives AgentLib a good trust model without losing the practical benefit of community curation.
