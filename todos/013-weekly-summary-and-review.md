# 013 Weekly Summary And Review

- [ ] Task complete

## Why This Exists

Weekly summaries are the app's reflective layer. They need to be generated automatically, stored, browsable, and complete enough to support meaningful review.

## Spec Coverage

- PRD: Section 9
- Architecture: Sections 17, 20.2

## Current Gap

- Summary generation exists in a simplified form and is partly tied to local automation.
- The UI does not yet expose the full summary payload described by the spec.

## Checklist

- [ ] Generate summaries automatically on the correct weekly cadence.
- [ ] Keep manual generation available when needed.
- [ ] Compute every summary field required by the PRD.
- [ ] Surface schedule adherence and backlog movement clearly.
- [ ] Surface revision health clearly.
- [ ] Surface MCQ insights clearly.
- [ ] Surface GT insights clearly.
- [ ] Persist summaries for later browsing.
- [ ] Build a readable weekly summary detail page that exposes the full content.
- [ ] Ensure summary regeneration is safe and does not create duplicates.

## Acceptance Criteria

- [ ] Weekly summaries appear without manual intervention in production.
- [ ] Stored summaries can be revisited later.
- [ ] The detail view contains the full reflective signal described in the spec.
- [ ] Summary data stays internally consistent with the underlying logs and schedule state.
