# 010 Schedule Browser And Retroactive Editing

- [ ] Task complete

## Why This Exists

The schedule browser should let the user inspect the full 100-day plan, edit past days, and correct history without breaking future schedule logic.

## Spec Coverage

- PRD: Sections 6.7, 10
- Architecture: Section 19

## Current Gap

- Future days are still editable.
- Retroactive completion is not fully wired to backlog cleanup and revision recalculation.

## Checklist

- [ ] Show the full schedule browser with clear today focus.
- [ ] Keep future days read-only.
- [ ] Keep past days editable.
- [ ] Allow retroactive completion with an actual completion date.
- [ ] Remove or resolve matching backlog items when retroactive completion covers them.
- [ ] Recompute revision anchors after retroactive completion.
- [ ] Keep day detail pages accurate after schedule shifts.
- [ ] Show enough context on each day to understand what changed versus the original plan.
- [ ] Prevent edits that would violate the schedule boundary rules.

## Acceptance Criteria

- [ ] Editing a past day updates every dependent surface correctly.
- [ ] Future days cannot be modified through the normal UI.
- [ ] Today is easy to find from the browser.
- [ ] Retroactive corrections are safe and reversible enough for real use.
