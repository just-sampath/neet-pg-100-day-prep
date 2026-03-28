# Revision Items Review

## Current Model

Revision items are now generated from the phase-dominant schedule, not from the retired manual JSON flow.

- only Phase 1 topic items marked `revisionEligible === true` create revision anchors
- those source items live in `block_a`, `block_b`, and `block_c`
- each completed eligible topic creates `D+1`, `D+3`, `D+7`, `D+14`, and `D+28`
- anchor date is the actual completion date when available, otherwise the mapped plan date

The live revision engine is implemented in `src/lib/domain/schedule.ts`.

## Routing Rules

Today routing is now aligned to the new workbook shape:

- due and lightly overdue items stay in the `06:30-07:45` morning block
- the visible morning queue caps at `5` items
- overflow is assigned to `final_review` first, then break micro-slots
- `3-6` day misses become catch-up revision routed to `block_c` or `final_review`
- `7+` day misses become `next_revision_phase` restudy pressure

## Time Budgeting

The morning block is now `06:30-07:45`, not the retired `06:30-08:00` slot.

Equal-time guidance is based on `75` minutes:

- `1 item` -> `~75 min each`
- `3 items` -> `~25 min each`
- `4 items` -> `~18 min each`
- `5 items` -> `~15 min each`

## Workbook Relationship

The workbook still contributes morning guidance through `Revision_Map`, but the live queue is authoritative once actual completion data exists.

- Phase 1: live revision queue is primary
- Phase 2 and Phase 3: workbook revision clusters, GT warm-up, and compression guidance remain visible while the live queue still supplies due work and overdue pressure

## Current UX Goal

The product should present revision as one coherent system:

- one morning revision truth
- phase-aware fallback wording from the workbook
- no separate retired static-vs-live completion semantics
- backlog-neutral handling for overdue revision pressure

## Remaining Review Questions

- whether grouped topic cards should clear multiple due intervals in one action
- whether later phases need stronger GT-derived reprioritization
- whether `5` visible items is always the right cap once real usage data accumulates
