# 013 Move MCQ Add Details Above Results

- [x] Task complete

## Why This Exists

The product decision is to surface the optional detail expander before the result buttons, while still preserving the one-tap `MCQ ID + result` fast path.

## Spec Coverage

- PRD: Sections 7.2, 18.3, 18.4, 18.5, 18.6
- Architecture: Sections 15, 26

## Current Gap

- Open in code. The detailed MCQ form renders the result buttons first and the `Add details` expander below them.

## Checklist

- [x] Reorder the one-by-one MCQ form so `Add details` appears before the result buttons.
- [x] Preserve the existing session-state memory for the expander.
- [x] Keep the submit behavior centered on the result buttons rather than turning the form into a heavier workflow.

## Acceptance Criteria

- [x] The optional details expander appears before `Right`, `Wrong`, and `Guessed Right`.
- [x] A user can still enter `MCQ ID` and tap a result without extra mandatory fields.
- [x] Subject/source persistence and expander-state memory still behave as designed.

## Implementation Notes

- Main surfaces: `src/components/app/mcq-detailed-entry-form.tsx`, `src/app/(app)/mcq/page.tsx`
- Preserve the PRD fast path even though the visual order changes.
