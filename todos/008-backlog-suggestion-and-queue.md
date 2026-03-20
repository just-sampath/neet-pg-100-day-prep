# 008 Backlog Suggestion And Queue

- [ ] Task complete

## Why This Exists

The backlog system must do more than store missed work. It should suggest realistic recovery slots, preserve sleep boundaries, and provide a calm queue for completion and rescheduling.

## Spec Coverage

- PRD: Sections 6.2, 6.4, 6.6, 6.8
- Architecture: Sections 12.2, 12.3, 12.4, 28.7, 28.8, 28.9

## Current Gap

- Suggestions are still simplistic and do not fully follow slot compatibility or same-subject preference.
- The queue view is missing several spec-level actions and fields.

## Checklist

- [ ] Build the full suggestion engine for single missed blocks and backlog recovery.
- [ ] Prefer same-subject compatible slots when suggesting recovery placement.
- [ ] Respect block-type compatibility when suggesting a slot.
- [ ] Respect the `06:30` to `23:00` study boundary for all suggestions.
- [ ] Ensure backlog suggestions never silently push work beyond the sleep boundary.
- [ ] Show days-in-backlog or equivalent aging information in the queue.
- [ ] Default the queue to pending backlog items.
- [ ] Add completion, dismiss, and reschedule flows with the exact metadata updates.
- [ ] Add a completion-date picker for retroactive backlog resolution.
- [ ] Add bulk actions if they are part of the intended workflow.
- [ ] Add any required ordering or prioritization controls.
- [ ] Match the queue summary content to the PRD.

## Acceptance Criteria

- [ ] Suggested slots are believable and safe for the user schedule.
- [ ] Queue actions update Today, Schedule, and Weekly views consistently.
- [ ] Pending backlog is easy to review and resolve without ambiguity.
- [ ] The backlog system remains neutral and non-punitive in language and tone.
