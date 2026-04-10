# Web Compatibility Badges Follow-Up

## Goal

Expose client compatibility metadata in the registry UI once the CLI target model exists.

## Proposed Badges

- `Built for`
- `Tested with`
- `Adapter available`

## Suggested Data Shape

The registry API now uses:

```ts
compatibility: {
  targets: Array<{
    targetId: string;
    builtFor: boolean;
    tested: boolean;
    adapterAvailable: boolean;
  }>;
}
```

Those fields should appear on:

- agent detail
- version detail
- optionally list cards later

## UI Placement

Primary placement:

- version page near the artifact/download section
- agent page near lifecycle/provenance badges

Secondary placement:

- creator page or home cards only after the detail pages are stable

## Non-Goals In This Slice

- no registry migration yet
- no publish UI for editing compatibility yet
- no persistent compatibility editing yet

## Current Implementation Notes

- detail pages render grouped compatibility badges
- the first slice uses server-side defaults for demo agents
- newly published agents currently default to empty compatibility

This note remains a follow-up target for persistence and publish-time editing after the CLI target-adapter model is in place.
