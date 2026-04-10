# MVP Monetization Guardrails

## Goal

Keep the MVP registry architecture close to the product shape needed for monetization later, without dragging enterprise/runtime complexity into the first useful release.

## Product Direction

The product ladder to preserve is:

1. Free registry for network effects
2. Private agents and teams
3. Execution billing
4. Enterprise controls
5. Marketplace
6. Runtime and orchestration

The core principle is:

> Registry attracts usage.
> Execution and enterprise features generate revenue.

## MVP Guardrails

### 1. Registry first, but do not hardcode “public only”

The MVP can stay public-first, but current data models and APIs should avoid assuming every agent is public forever.

Implication:
- leave room for visibility/access policy on agents and versions
- do not couple discovery logic too tightly to public-only assumptions

### 2. Keep agent identity separate from entitlements

`namespace/name` and versioning should stay clean and portable.
Billing, access rights, plan checks, and marketplace entitlements should layer on top.

Implication:
- avoid baking payment state into canonical package identity
- keep package metadata portable outside AgentLib

### 3. Version metadata may be editable, artifacts must stay immutable

This matters for monetization and trust.
Compatibility badges, curation, safety annotations, and marketplace labels may evolve.
Artifacts and published package contents must not.

Implication:
- treat curable metadata separately from immutable package blobs
- current compatibility editing fits this rule and should stay in that lane

### 4. Organizations are not optional long term

Private agents, ACLs, billing, SSO, and marketplace payouts all push toward org-aware ownership.

Implication:
- current ownership flows may start user-centric
- but storage and API naming should leave room for org owners, member roles, and policy checks

### 5. Usage telemetry should be event-friendly

Simple counters are fine in MVP, but monetization later depends on auditable events.

Implication:
- counters are acceptable as cached aggregates
- but avoid designs that make future execution/download/use events impossible to model cleanly

### 6. Runtime must remain a separate layer

AgentLib can grow into execution, but the registry should not be forced to become the runtime.

Implication:
- keep registry/package/discovery concerns modular
- future execution records should reference agents and versions, not redefine them

## Near-Term Architecture Consequences

These should influence MVP choices now:

- keep room for `visibility` / `access_policy` on agents and versions
- prefer org-capable ownership concepts over user-only assumptions
- preserve immutable versions and editable curation metadata
- treat metrics as aggregates over events, not the only source of truth
- avoid web/CLI UX that assumes only public anonymous consumption exists
- keep compatibility, provenance, trust, and safety metadata as additive layers around portable packages

## Monetization-Aligned MVP Priorities

### Short term

- strong registry UX
- publishing flow
- search and metadata quality
- compatibility and trust signals

### Medium term

- basic execution path
- logs and observability
- public API and programmatic consumption

### Long term

- private org agents
- ACL and enterprise security
- marketplace entitlements
- runtime billing
- orchestration and analytics

## Explicit Non-Goals For MVP

Do not prematurely build:

- full enterprise IAM
- complex billing engine
- general-purpose runtime scheduler
- marketplace payout system
- heavy compliance layer

But do avoid decisions that would force painful rewrites when those arrive.

## Current Working Rule

When designing MVP slices:

- optimize for registry usefulness today
- preserve clear seams for private access, execution, and monetization tomorrow
- do not let monetization concerns contaminate portable package identity
