# 011 MCQ Tracker And Analytics

- [ ] Task complete

## Why This Exists

The MCQ tracker is not just logging. It is supposed to make high-volume entry fast while preserving enough detail to support pattern detection and weekly review.

## Spec Coverage

- PRD: Sections 5.7, 7, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6
- Architecture: Sections 15, 28.1, 28.2, 28.3, 28.4, 28.5, 28.6

## Current Gap

- Bulk mode exists but is simplified.
- One-by-one mode lacks the full ergonomic detail flow.
- Analytics do not yet expose all required breakdowns.

## Checklist

- [ ] Match the bulk entry fields and defaults to the spec.
- [ ] Use canonical subject values rather than loose free-text input where required.
- [ ] Build the one-by-one entry form with the exact fast-entry UX.
- [ ] Add the `Add details` collapse and remembered expansion state.
- [ ] Remember subject and source intelligently between entries when appropriate.
- [ ] Use the canonical result, cause, fix, tag, and priority vocabularies.
- [ ] Add quick-tap result buttons for the detailed flow.
- [ ] Wire Today quick-log entry into the MCQ tracker.
- [ ] Build analytics for trend over time.
- [ ] Build the right-versus-wrong breakdown.
- [ ] Build accuracy-by-subject analytics.
- [ ] Ensure weekly summaries can pull the necessary MCQ insights.

## Acceptance Criteria

- [ ] A user can log both bulk and detailed MCQ work quickly on mobile.
- [ ] Analytics expose enough signal to identify weak areas and repeated mistakes.
- [ ] Reference-code vocabularies are enforced consistently.
- [ ] MCQ data contributes correctly to weekly review output.
