# 012 GT Tracker And Analytics

- [x] Task complete

## Why This Exists

GT logging is one of the highest-value review surfaces in the app. The form and analytics need to support serious pattern analysis, not only simple score storage.

## Spec Coverage

- PRD: Section 8, Section 18.1
- Architecture: Sections 16, 28.1

## Current Gap

- Core GT logging exists, but attempt-context controls, section A-E inputs, and deeper analytics are not complete.

## Checklist

- [x] Prefill GT schedule context from the generated plan.
- [x] Match the GT form fields to the PRD.
- [x] Add the exact attempt-context controls rather than generic text input.
- [x] Add section A-E score breakdown inputs.
- [x] Persist notes and weakness tracking with the right structure.
- [x] Build score-trend analytics.
- [x] Build section-pattern analytics.
- [x] Build GT-over-GT comparison views.
- [x] Build wrapper-trend analytics if required by the spec.
- [x] Surface repeated weakness patterns across GT entries.
- [x] Ensure weekly summaries can pull the necessary GT insights.

## Acceptance Criteria

- [x] Logging a GT captures enough structured detail for useful review.
- [x] Analytics make section-level and trend-level weakness visible.
- [x] GT schedule dates stay accurate after schedule shifts.
- [x] Weekly review can summarize GT performance without manual reconstruction.
