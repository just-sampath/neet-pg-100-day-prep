# 006 Hide Empty Recovery Radar

- [x] Task complete

## Why This Exists

Recovery UI should appear when it has actual recovery signal, not as a permanently occupied panel. If it stays visible with little to say, it trains the user to ignore it.

## Spec Coverage

- PRD: Sections 5, 6
- Architecture: Sections 10, 12, 13

## Current Gap

- Open in code. `Recovery Radar` always renders, and it currently mixes recovery signal with unrelated controls, which prevents the panel from ever truly disappearing.

## Checklist

- [x] Define what counts as meaningful recovery signal for the Today surface.
- [x] Render `Recovery Radar` only when that signal exists.
- [x] Move unrelated controls out of the panel if they are currently the only reason it stays visible.
- [x] Preserve useful backlog and shift navigation when recovery pressure is real.

## Acceptance Criteria

- [x] On a clean green day with no meaningful recovery pressure, `Recovery Radar` does not render.
- [x] When recovery signal exists, the panel explains something actionable rather than restating generic status.
- [x] Hiding the panel does not hide unrelated controls that still need another home.

## Implementation Notes

- Main surface: `src/app/(app)/today/page.tsx`
- This task may require splitting recovery messaging from theme or utility controls.
