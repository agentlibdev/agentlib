# Package Kind Contract

**Goal:** Introduce a minimal `packageKind` contract that keeps AgentLib aligned with both native AgentLib packages and the emerging Agent Skills ecosystem without overcomplicating the MVP.

## Motivation

Not every useful registry entry is the same shape:

- some are native AgentLib packages with a strong `agent.yaml`
- some will be future first-class Agent Skills packages
- some are large repository snapshots that users want indexed and browsable as one package

`packageKind` gives the registry an explicit, stable way to describe that distinction.

## Contract

Recognized values:

- `agent`
- `agent-skill`
- `repository-snapshot`

Rules for the MVP:

- default to `agent`
- expose `packageKind` in read APIs:
  - `GET /api/v1/agents`
  - `GET /api/v1/agents/:namespace/:name`
  - `GET /api/v1/agents/:namespace/:name/versions/:version`
- allow publish payloads to provide `packageKind`
- persist `packageKind` on the logical package (`agents` table), not per version

## Meaning

### `agent`

Native AgentLib package.

Expected shape:

- canonical manifest
- normal versioned agent package
- current default for all existing published data

### `agent-skill`

Recognized package aligned with the Agent Skills standard.

For the MVP this only means:

- AgentLib can label the package as an Agent Skills entry
- read APIs and UI can distinguish it from native packages

It does **not** yet imply:

- full skill import pipeline
- individual skill decomposition
- extra Agent Skills-specific validation

### `repository-snapshot`

Repository-first package where the main value is the README, provenance, docs, and artifact tree.

Good examples:

- `obra/superpowers`
- `agentskills/agentskills`

## Guardrails

- `packageKind` is descriptive metadata, not execution logic.
- Do not overload it with billing, ACL, or runtime semantics.
- Do not require `agent-skill` support to be feature-complete before exposing the label.
- Keep existing packages backward-compatible by defaulting old data to `agent`.
