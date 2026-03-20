# 005 Revision Engine Spec Alignment

- [x] Task complete

## Why This Exists

Morning revision is one of the product-defining features. It must be derived from actual completion behavior, not only from the original mapped day.

## Spec Coverage

- PRD: Sections 4.5, 5.4, 6.6, 6.7
- Architecture: Sections 9, 10

## Current Gap

- Closed in the current repo state. The revision engine now derives from block-level anchors, supports overdue routing, and is exercised by deterministic tests.

## Checklist

- [x] Derive revision anchors from actual block completion when available.
- [x] Fall back to the planned mapped date only when actual completion does not exist yet.
- [x] Schedule revisions at `D+1`, `D+3`, `D+7`, `D+14`, and `D+28`.
- [x] Limit the visible morning queue to 5 items.
- [x] Spill overflow to night recall first.
- [x] Spill remaining overflow to break micro-slots according to the spec.
- [x] Surface a real 3-day overflow suggestion when morning load remains too high.
- [x] Convert `3-6` day overdue items into catch-up revision items.
- [x] Convert `7+` day overdue items into re-study flags with the correct recovery language.
- [x] Show time-per-item allocation in the Today View.
- [x] Recompute revision results after retroactive completion edits.
- [x] Add deterministic tests around revision generation and rollover behavior.

## Acceptance Criteria

- [x] Completing a topic late changes its future revision anchors correctly.
- [x] Morning revision display shows the right count, order, and overflow behavior.
- [x] Overdue items move into the correct recovery buckets.
- [x] Retroactive completion updates the queue without corrupting prior state.
