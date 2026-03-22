# 011 Fix Dropdown Readability

- [x] Task complete

## Why This Exists

If a select control becomes white-on-white or otherwise unreadable in the actual OS-rendered menu, the form is effectively broken even when the underlying logic is correct.

## Spec Coverage

- PRD: Sections 6.8, 7, 14, 16
- Architecture: Sections 3, 12, 15, 26

## Current Gap

- Open in code. The shared `.field` styling makes the closed control look themed, but native select rendering can still become unreadable on real platforms and themes.

## Checklist

- [x] Audit select readability on Backlog and MCQ where the issue was reported.
- [x] Adjust styling or component choice so both the closed field and the open menu remain readable.
- [x] Verify the fix in both light and dark themes.

## Acceptance Criteria

- [x] Select controls are readable before interaction.
- [x] Open dropdown menus are readable on the supported environments being tested.
- [x] The solution works across the affected forms instead of fixing only one page.

## Implementation Notes

- Main surfaces: `src/app/globals.css`, `src/app/(app)/backlog/page.tsx`, `src/components/app/mcq-detailed-entry-form.tsx`
- Native select behavior can be platform-specific; this task requires real-device or environment verification.
