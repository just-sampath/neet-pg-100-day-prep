# 004 Excel Ingestion And Static Content

- [ ] Task complete

## Why This Exists

The product is built on a fixed workbook and quote CSV. Production readiness requires the app to derive its schedule structure from source data with validation rather than from hidden hard-coded assumptions.

## Spec Coverage

- PRD: Sections 4.1, 4.2, 4.3, 4.4, 4.6, 8.1, 18
- Architecture: Sections 8, 16, 28

## Current Gap

- The generator reads the main planning sheets, but not every workbook sheet is functionally used.
- Trackable block timing still relies on hard-coded mappings rather than fully workbook-driven data.

## Checklist

- [ ] Validate and parse every workbook sheet needed for product behavior.
- [ ] Remove hidden hard-coded block-timing assumptions if the workbook already provides them.
- [ ] Generate typed schedule days, block templates, GT plan entries, and subject metadata from source data.
- [ ] Validate the 100-day plan for completeness and date-mapping consistency.
- [ ] Validate subject references against the canonical subject list.
- [ ] Validate GT entries and their mapped day references.
- [ ] Generate or validate break and meal separators if they are part of the workbook truth.
- [ ] Fail generation loudly when required workbook fields are missing or malformed.
- [ ] Add tests that detect accidental source-data regressions.

## Acceptance Criteria

- [ ] The runtime schedule is traceable directly to the workbook and quote CSV.
- [ ] Data generation fails fast on malformed source data.
- [ ] The generated modules contain everything needed for schedule, GT, and subject rendering.
- [ ] No schedule-critical behavior depends on unexplained magic constants.
