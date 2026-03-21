# 010 Schedule Browser And Retroactive Editing

- [x] Task complete

## Why This Exists

The schedule browser should let the user inspect the full 100-day plan, edit past days, and correct history without breaking future schedule logic.

## Spec Coverage

- PRD: Sections 6.7, 10
- Architecture: Section 19

## Current Gap

- Future days are still editable.
- Retroactive completion is not fully wired to backlog cleanup and revision recalculation.

## Checklist

- [x] Show the full schedule browser with clear today focus.
- [x] Keep future days read-only.
- [x] Keep past days editable.
- [x] Allow retroactive completion with an actual completion date.
- [x] Remove or resolve matching backlog items when retroactive completion covers them.
- [x] Recompute revision anchors after retroactive completion.
- [x] Keep day detail pages accurate after schedule shifts.
- [x] Show enough context on each day to understand what changed versus the original plan.
- [x] Prevent edits that would violate the schedule boundary rules.

## Acceptance Criteria

- [x] Editing a past day updates every dependent surface correctly.
- [x] Future days cannot be modified through the normal UI.
- [x] Today is easy to find from the browser.
- [x] Retroactive corrections are safe and reversible enough for real use.
