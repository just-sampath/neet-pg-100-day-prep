# 008 Backlog Suggestion And Queue

- [x] Task complete

## Why This Exists

The backlog system must do more than store missed work. It should suggest realistic recovery slots, preserve sleep boundaries, and provide a calm queue for completion and rescheduling.

## Spec Coverage

- PRD: Sections 6.2, 6.4, 6.6, 6.8
- Architecture: Sections 12.2, 12.3, 12.4, 28.7, 28.8, 28.9

## Current Gap

- Closed. Suggestions, queue actions, and assigned-recovery integration now match the intended product behavior for this gate.

## Checklist

- [x] Build the full suggestion engine for single missed blocks and backlog recovery.
- [x] Prefer same-subject compatible slots when suggesting recovery placement.
- [x] Respect block-type compatibility when suggesting a slot.
- [x] Respect the `06:30` to `23:00` study boundary for all suggestions.
- [x] Ensure backlog suggestions never silently push work beyond the sleep boundary.
- [x] Show days-in-backlog or equivalent aging information in the queue.
- [x] Default the queue to pending backlog items.
- [x] Add completion, dismiss, and reschedule flows with the exact metadata updates.
- [x] Add a completion-date picker for retroactive backlog resolution.
- [x] Add bulk actions if they are part of the intended workflow.
- [x] Add any required ordering or prioritization controls.
- [x] Match the queue summary content to the PRD.

## Acceptance Criteria

- [x] Suggested slots are believable and safe for the user schedule.
- [x] Queue actions update Today and Schedule views consistently, with rescheduled recovery now synchronized to the destination block lifecycle.
- [x] Pending backlog is easy to review and resolve without ambiguity.
- [x] The backlog system remains neutral and non-punitive in language and tone.
