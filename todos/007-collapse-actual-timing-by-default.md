# 007 Collapse Actual Timing By Default

- [x] Task complete

## Why This Exists

Showing the full time editor under every visible block makes the timeline feel heavier than it needs to be. The product decision is to keep actual-time editing available, but not fully expanded by default.

## Spec Coverage

- PRD: Sections 5.6, 6.4
- Architecture: Sections 10, 12

## Current Gap

- Open in code. `TimeEditor` always renders its full form under every visible block, which increases noise even when the user is not editing times.

## Checklist

- [x] Replace the always-open time editor with a collapsed-by-default interaction.
- [x] Keep the overflow and sleep-protection flow reachable once the editor is opened.
- [x] Ensure the control label clearly communicates that it edits actual time, not planned time.

## Acceptance Criteria

- [x] A block does not show the full `Actual Timing` form until the user expands it.
- [x] Users can still edit start/end times and trigger overrun handling from the collapsed control.
- [x] The default Today timeline becomes easier to scan at a glance.

## Implementation Notes

- Main surfaces: `src/components/app/time-editor.tsx`, `src/app/(app)/today/page.tsx`, `src/app/(app)/schedule/[day]/page.tsx`
- Keep the edit affordance accessible for both Today and eligible schedule-day detail views.
