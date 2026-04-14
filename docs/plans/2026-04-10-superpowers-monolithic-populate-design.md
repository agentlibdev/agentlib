# Superpowers Monolithic Populate Design

**Goal:** Add a realistic demo path that publishes `obra/superpowers` into the registry as a single monolithic package, both from a local checkout and from GitHub.

## Why

The current demo populate creates synthetic agents with small, hand-written artifacts. That is useful for smoke coverage, but it does not exercise the parts of the registry that benefit most from a real repository:

- deep artifact trees
- README-heavy detail pages
- repository and homepage provenance
- compatibility badges across multiple targets
- ZIP download and artifact viewer UX

`obra/superpowers` is a strong reference package for this because it is a real repo with a large README, rich folder structure, and explicit multi-agent-platform support.

This should also stay aligned with the shape of repositories like `agentskills/agentskills`, which are not a single “skill” or “agent” in the narrow sense, but a monolithic open-format/specification repository containing documentation, reference material, and ecosystem assets. The registry demo path should therefore model a **repository snapshot package**, not assume that every published package maps to one leaf skill directory.

## Scope

Treat `obra/superpowers` as **one published package**, not as decomposed skills or subpackages.

The same repository-snapshot model should also be valid later for `agentskills/agentskills` and similar projects:

- repository-first
- README- and docs-heavy
- many nested directories that are meaningful artifacts
- no requirement that the repo already ships an `agent.yaml`

Publish identity:

- `namespace`: `obra`
- `name`: `superpowers`
- version inferred from the repo snapshot or provided explicitly by the caller

Compatibility defaults should reflect the repo’s real positioning:

- built for: `codex`, `claude-code`, `cursor`, `gemini-cli`, `github-copilot`, `opencode`, `antigravity`
- adapter available: `openclaw`

## Approach

Introduce a generic helper that can build a publish payload from an arbitrary local repository snapshot:

- pick a manifest template for monolithic registry demo packages
- read canonical docs if available (`README.md`, optional `LICENSE`)
- walk the repo and include artifacts recursively
- skip junk and local-only directories (`.git`, `node_modules`, build outputs, temporary files)
- attach provenance and compatibility metadata

That helper should be phrased generically as a **repository snapshot publisher**, not a `superpowers` special case, so the same primitive can later publish:

- `obra/superpowers`
- `agentskills/agentskills`
- other docs/spec/framework repos that users want indexed and browsable as monolithic packages

Then expose two scripts:

1. `demo:populate:superpowers:local`
   - takes a local repo path
   - uses the local repo publish helper
   - posts directly to `/api/v1/publish`

2. `demo:populate:superpowers:github`
   - takes the GitHub repo URL or defaults to `https://github.com/obra/superpowers`
   - clones the repository to a temporary directory
   - reuses the same local repository publish helper
   - publishes the resulting snapshot directly through `/api/v1/publish`

## Guardrails

- Keep this as demo data, not a new canonical import model.
- Do not invent package decomposition into `skills/`, `commands/`, or `agents/` yet.
- Do not assume every valuable registry entry is an individual runnable agent. Repository/spec/ecosystem packages are acceptable demo entries as long as provenance is explicit.
- Prefer a reusable helper over a one-off `superpowers` special case, but keep the surface intentionally small.
- Preserve immutable publish semantics: the script prepares and submits a normal publish payload; it does not mutate versions after publication.
