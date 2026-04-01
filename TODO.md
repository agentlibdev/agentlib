# AgentLib TODO

## Current State

- Local seed reset is in place with `npm run d1:reset:local`.
- Richer local demo population is in place with `npm run populate:demo:local`.
- Generic local example publishing is in place with `npm run publish:example:local -- <example-dir>`.
- The legacy `phase-2-registry-*` worktrees have been retired.

## Next Useful Work

## [ ] 1. Smoke `publish:example:local` against a live local Worker
- Start `npm run dev:api:local`
- Run `npm run publish:example:local -- ../agent-examples`
- Verify the published package appears in `GET /api/v1/agents`
- Verify artifact listing and at least one artifact download

## [ ] 2. Verify Bolt-style parity on the live local app
- Rebuild and open the web app after the Tailwind Bolt-style pass on `main`
- Compare the header, search, cards, filters, and right rail against `design-reference`
- Fix any remaining route-by-route visual mismatches instead of reviving `ui-ux-refresh`

## [ ] 3. Review `agent-examples` follow-up branches
- Compare `examples-catalog` against the current root-level happy-path fixture
- Decide whether to keep the root fixture only, add catalog examples, or do both
- Align docs in the separate `docs` repo if the examples direction changes

## [ ] 4. Keep local workflow docs honest
- When local scripts change, update `README.md`
- When contributor flow changes, update `docs/local-development.md`
- Keep `docs/runbooks/local-and-staging.md` operator-focused

## Notes

- `publish:example:local` is not the richer demo seed.
- `populate:demo:local` remains the command that creates the expanded multi-user, multi-agent local demo with downloads, pins, and stars.
