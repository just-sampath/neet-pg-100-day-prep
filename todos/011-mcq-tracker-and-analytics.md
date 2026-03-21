# 011 MCQ Tracker And Analytics

- [x] Task complete

## Why This Exists

The MCQ tracker is not just logging. It is supposed to make high-volume entry fast while preserving enough detail to support pattern detection and weekly review.

## Spec Coverage

- PRD: Sections 5.7, 7, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6
- Architecture: Sections 15, 28.1, 28.2, 28.3, 28.4, 28.5, 28.6

## Current Gap

- Resolved. Bulk entry, one-by-one entry, analytics, and weekly-summary feed now match the MCQ tracker requirements in the PRD and technical architecture.

## Checklist

- [x] Match the bulk entry fields and defaults to the spec.
- [x] Use canonical subject values rather than loose free-text input where required.
- [x] Build the one-by-one entry form with the exact fast-entry UX.
- [x] Add the `Add details` collapse and remembered expansion state.
- [x] Remember subject and source intelligently between entries when appropriate.
- [x] Use the canonical result, cause, fix, tag, and priority vocabularies.
- [x] Add quick-tap result buttons for the detailed flow.
- [x] Wire Today quick-log entry into the MCQ tracker.
- [x] Build analytics for trend over time.
- [x] Build the right-versus-wrong breakdown.
- [x] Build accuracy-by-subject analytics.
- [x] Ensure weekly summaries can pull the necessary MCQ insights.

## Acceptance Criteria

- [x] A user can log both bulk and detailed MCQ work quickly on mobile.
- [x] Analytics expose enough signal to identify weak areas and repeated mistakes.
- [x] Reference-code vocabularies are enforced consistently.
- [x] MCQ data contributes correctly to weekly review output.
