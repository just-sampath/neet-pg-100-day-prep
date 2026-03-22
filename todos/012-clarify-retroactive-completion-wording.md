# 012 Clarify Retroactive Completion Wording

- [x] Task complete

## Why This Exists

`Complete with date` is too ambiguous for a user-level control. The feature is valid, but the wording does not clearly explain that it is a retroactive completion action for past schedule days.

## Spec Coverage

- PRD: Sections 6.7, 10
- Architecture: Sections 19, 25

## Current Gap

- Open in code. The schedule day detail page exposes the retroactive completion flow with a vague button label and minimal framing.

## Checklist

- [x] Rename the action so it clearly reads as retroactive completion.
- [x] Add or improve surrounding helper text so the selected date is understandable.
- [x] Keep the control limited to the past-day edit surface where retroactive completion is allowed.

## Acceptance Criteria

- [x] A user can tell what the action does without outside explanation.
- [x] The date field and button read as one coherent retroactive-completion flow.
- [x] The wording does not imply the action is available on future or normal Today blocks.

## Implementation Notes

- Main surface: `src/app/(app)/schedule/[day]/page.tsx`
- Keep the underlying reconciliation behavior intact; this task is about user-facing clarity.
