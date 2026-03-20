# 005 Revision Engine Spec Alignment

- [ ] Task complete

## Why This Exists

Morning revision is one of the product-defining features. It must be derived from actual completion behavior, not only from the original mapped day.

## Spec Coverage

- PRD: Sections 4.5, 5.4, 6.6, 6.7
- Architecture: Sections 9, 10

## Current Gap

- The current queue is simplified to day-level focus anchors rather than actual completed topic or block anchors.
- Overflow and overdue handling exist, but the full spec behavior is not fully surfaced.

## Checklist

- [ ] Derive revision anchors from actual block completion when available.
- [ ] Fall back to the planned mapped date only when actual completion does not exist yet.
- [ ] Schedule revisions at `D+1`, `D+3`, `D+7`, `D+14`, and `D+28`.
- [ ] Limit the visible morning queue to 5 items.
- [ ] Spill overflow to night recall first.
- [ ] Spill remaining overflow to break micro-slots according to the spec.
- [ ] Surface a real 3-day overflow suggestion when morning load remains too high.
- [ ] Convert `3-6` day overdue items into catch-up revision items.
- [ ] Convert `7+` day overdue items into re-study flags with the correct recovery language.
- [ ] Show time-per-item allocation in the Today View.
- [ ] Recompute revision results after retroactive completion edits.
- [ ] Add deterministic tests around revision generation and rollover behavior.

## Acceptance Criteria

- [ ] Completing a topic late changes its future revision anchors correctly.
- [ ] Morning revision display shows the right count, order, and overflow behavior.
- [ ] Overdue items move into the correct recovery buckets.
- [ ] Retroactive completion updates the queue without corrupting prior state.
