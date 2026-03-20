# 012 GT Tracker And Analytics

- [ ] Task complete

## Why This Exists

GT logging is one of the highest-value review surfaces in the app. The form and analytics need to support serious pattern analysis, not only simple score storage.

## Spec Coverage

- PRD: Section 8, Section 18.1
- Architecture: Sections 16, 28.1

## Current Gap

- Core GT logging exists, but attempt-context controls, section A-E inputs, and deeper analytics are not complete.

## Checklist

- [ ] Prefill GT schedule context from the generated plan.
- [ ] Match the GT form fields to the PRD.
- [ ] Add the exact attempt-context controls rather than generic text input.
- [ ] Add section A-E score breakdown inputs.
- [ ] Persist notes and weakness tracking with the right structure.
- [ ] Build score-trend analytics.
- [ ] Build section-pattern analytics.
- [ ] Build GT-over-GT comparison views.
- [ ] Build wrapper-trend analytics if required by the spec.
- [ ] Surface repeated weakness patterns across GT entries.
- [ ] Ensure weekly summaries can pull the necessary GT insights.

## Acceptance Criteria

- [ ] Logging a GT captures enough structured detail for useful review.
- [ ] Analytics make section-level and trend-level weakness visible.
- [ ] GT schedule dates stay accurate after schedule shifts.
- [ ] Weekly review can summarize GT performance without manual reconstruction.
