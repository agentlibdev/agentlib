# AGENTS.md

This file defines repo-specific operating rules for `agentlib`.

The root [AGENTS.md](/home/raul/agentlibdev/AGENTS.md) still applies. This file narrows execution for the core registry repository.

## Mission

Build the first usable AgentLib registry on a Cloudflare-first stack:

- public web UI
- REST API
- publish pipeline
- metadata persistence
- artifact storage
- provider integration boundaries

## Scope

This repo owns:

- Cloudflare Workers application code
- D1 schema and migrations
- R2 integration abstractions
- Queues and Workflows integration points
- authentication and publish permissions
- registry read APIs
- web experience for discovery and detail views

This repo does not own:

- the canonical manifest contract
- example agent packages
- long-form project documentation
- the future Go CLI implementation

## Initial Architecture Rule

Prefer a modular monorepo with clear boundaries:

- `apps/api`
- `apps/web`
- `packages/core`
- `packages/db`
- `packages/validation`
- `packages/storage`
- `packages/providers`
- `infra/cloudflare`
- `migrations`

Do not collapse all logic into a single Worker entrypoint unless there is a strong short-term reason.

## Data Model Baseline

Align early code with these entities:

- `Provider`
- `SourceRepository`
- `Agent`
- `AgentVersion`
- `Artifact`
- `User`
- `Organization`

Published `AgentVersion` records are immutable.

## API Rules

Use REST-style JSON APIs only.

Initial endpoints should trend toward:

- `GET /health`
- `GET /api/v1/agents`
- `GET /api/v1/agents/:namespace/:name`
- `GET /api/v1/agents/:namespace/:name/versions`
- `GET /api/v1/agents/:namespace/:name/versions/:version`
- `POST /api/v1/publish`
- `POST /api/v1/providers/github/import`

Rules:

- explicit JSON error objects
- no hidden magic defaults
- pagination for list endpoints
- backward-compatible response changes only after public use

## Publish Pipeline Rules

The first publish flow must support manual/local publish before provider sync.

Minimum pipeline:

1. receive package or manifest
2. validate against `agent-schema`
3. reject mutable overwrite of an existing version
4. persist metadata in D1
5. persist files or bundle in R2
6. expose version through read APIs

Do not build provider-specific logic into the core publish path.

## Cloudflare Rules

Prefer:

- Workers for request handling
- D1 for metadata
- R2 for artifacts
- Queues for async follow-up work
- Workflows for multi-step publish/import orchestration

Avoid introducing infrastructure that assumes AWS as the primary execution model.

## Testing Rules

Testing is mandatory for core behavior.

Priority coverage:

- route handlers
- manifest validation integration
- version immutability
- publish permissions
- D1 persistence logic
- provider parsing

Use TDD where practical:

1. write failing test
2. verify failure
3. implement minimal code
4. verify pass

## Documentation Rules

When behavior changes, update the nearest documentation in the same change:

- local README updates for repo-level changes
- architecture notes for structural decisions
- API reference notes when contracts change

## Approval Gates For This Repo

Ask before:

- introducing a new public API shape
- freezing D1 storage layout that other repos or tools will depend on
- choosing auth/session strategy
- choosing artifact packaging format
- making coordinated changes with `agent-schema`, `docs`, or CLI contracts

## Execution Priority

Unless directed otherwise, use this order:

1. bootstrap repo structure
2. add health endpoint
3. add D1 schema and migrations
4. add agent list/detail endpoints
5. add manual publish flow
6. add artifact retrieval
7. add GitHub provider integration

## Definition of Done

Work in this repo is done when:

- implementation exists
- tests or checks pass
- docs changed with the code
- assumptions are stated
- storage and API implications are explicit

