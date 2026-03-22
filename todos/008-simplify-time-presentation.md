# 008 Simplify Time Presentation

- [x] Task complete

## Why This Exists

The user feedback is clear that blocks currently feel like they show too many time concepts at once. Scheduled time, duration copy, and actual time need a clearer hierarchy.

## Spec Coverage

- PRD: Sections 5, 5.6
- Architecture: Sections 10, 26

## Current Gap

- Open in code. Today block cards show the scheduled slot, a duration-oriented helper line, and the full `Actual Timing` UI, which makes the block harder to parse quickly.

## Checklist

- [x] Define one primary scheduled-time treatment for each block card.
- [x] Move actual-time details behind the collapsed time-edit control.
- [x] Reduce or rewrite helper copy that duplicates time information without adding clarity.
- [x] Preserve overflow visibility once a block is actually being edited.

## Acceptance Criteria

- [x] A user can tell the planned time for a block at a glance.
- [x] A user no longer feels like each block shows three separate timings by default.
- [x] Actual-time edits remain understandable once opened.

## Implementation Notes

- Main surface: `src/app/(app)/today/page.tsx`
- Coordinate this task with `007-collapse-actual-timing-by-default.md` so the final card design is coherent.
