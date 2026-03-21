# 014 Theme Analytics Surfaces

- [ ] Task complete

## Why This Exists

Analytics are only useful if they stay legible in the actual app theme. The current chart defaults are not reliable enough for tooltip, legend, and contrast readability.

## Spec Coverage

- PRD: Sections 7.3, 8.3, 14, 16
- Architecture: Sections 15, 16, 26

## Current Gap

- Open in code. MCQ charts and GT charts rely on mostly default Recharts tooltip and legend styling, which makes readability inconsistent across the app themes.

## Checklist

- [ ] Add explicit themed tooltip styling for analytics charts.
- [ ] Add explicit legend and axis styling where the current defaults are too faint or mismatched.
- [ ] Audit MCQ and GT chart components together if the solution is shared.
- [ ] Verify empty states and low-data states remain readable after the theming pass.

## Acceptance Criteria

- [ ] Tooltips, legends, axis labels, and data contrast remain readable in dark and light themes.
- [ ] MCQ analytics no longer feels unreadable because of chart styling.
- [ ] GT analytics benefits from the same readability improvements where applicable.

## Implementation Notes

- Main surfaces: `src/components/charts/mcq-trend-chart.tsx`, `src/components/charts/mcq-breakdown-chart.tsx`, `src/components/charts/mcq-subject-accuracy-chart.tsx`
- Also review related GT chart components in `src/components/charts/` so the solution stays consistent.
