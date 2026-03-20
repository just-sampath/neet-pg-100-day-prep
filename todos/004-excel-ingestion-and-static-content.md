# 004 Excel Ingestion And Static Content

- [x] Task complete

## Why This Exists

The product is built on a fixed workbook and quote CSV. Production readiness requires the app to derive its schedule structure from source data with validation rather than from hidden hard-coded assumptions.

## Spec Coverage

- PRD: Sections 4.1, 4.2, 4.3, 4.4, 4.6, 8.1, 18
- Architecture: Sections 8, 16, 28

## Status

- The generator now validates all required workbook sheets before producing static modules.
- Trackable block timing is derived from `Block_Hours` instead of hidden duration assumptions.
- The generated schedule bundle now includes workbook readme metadata and normalized block templates.
- Regression tests compare generated schedule data back to the workbook so source-data drift fails fast.

## Checklist

- [x] Validate and parse every workbook sheet needed for product behavior.
- [x] Remove hidden hard-coded block-timing assumptions if the workbook already provides them.
- [x] Generate typed schedule days, block templates, GT plan entries, and subject metadata from source data.
- [x] Validate the 100-day plan for completeness and date-mapping consistency.
- [x] Validate subject references against the canonical subject list.
- [x] Validate GT entries and their mapped day references.
- [x] Generate or validate break and meal separators if they are part of the workbook truth.
- [x] Fail generation loudly when required workbook fields are missing or malformed.
- [x] Add tests that detect accidental source-data regressions.

## Acceptance Criteria

- [x] The runtime schedule is traceable directly to the workbook and quote CSV.
- [x] Data generation fails fast on malformed source data.
- [x] The generated modules contain everything needed for schedule, GT, and subject rendering.
- [x] No schedule-critical behavior depends on unexplained magic constants.
