# 013 Weekly Summary And Review

- [x] Task complete

## Why This Exists

Weekly summaries are the app's reflective layer. They need to be generated automatically, stored, browsable, and complete enough to support meaningful review.

## Spec Coverage

- PRD: Section 9
- Architecture: Sections 17, 20.2

## Current Gap

- Weekly generation now uses the correct Sunday-end cadence and safe upsert semantics.
- The weekly list/detail UI now exposes the full stored review payload.

## Checklist

- [x] Generate summaries automatically on the correct weekly cadence.
- [x] Keep manual generation available when needed.
- [x] Compute every summary field required by the PRD.
- [x] Surface schedule adherence and backlog movement clearly.
- [x] Surface revision health clearly.
- [x] Surface MCQ insights clearly.
- [x] Surface GT insights clearly.
- [x] Persist summaries for later browsing.
- [x] Build a readable weekly summary detail page that exposes the full content.
- [x] Ensure summary regeneration is safe and does not create duplicates.

## Acceptance Criteria

- [x] Weekly summaries appear without manual intervention in production.
- [x] Stored summaries can be revisited later.
- [x] The detail view contains the full reflective signal described in the spec.
- [x] Summary data stays internally consistent with the underlying logs and schedule state.
