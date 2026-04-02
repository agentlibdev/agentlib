# Web Compatibility Badges Follow-Up

## Goal

Expose client compatibility metadata in the registry UI once the CLI target model exists.

## Proposed Badges

- `Built for`
- `Tested with`
- `Adapter available`

## Suggested Data Shape

The registry API should eventually expose:

- `builtForTargets: string[]`
- `testedTargets: string[]`
- `availableAdapters: string[]`

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
- no web implementation yet

This note is a follow-up target after the CLI target-adapter model is in place.
