# 005 Move Pace Dial Higher

- [x] Task complete

## Why This Exists

The pace decision is one of the most important inputs on Today. It should be discoverable before the user scans through the heavier hero and timeline content.

## Spec Coverage

- PRD: Sections 5, 6
- Architecture: Sections 10, 11

## Current Gap

- Open in code. `Pace Dial` currently sits in the right rail below the larger Today hero, which makes it feel secondary even though it reshapes the whole day.

## Checklist

- [x] Reposition the `Pace Dial` higher in the Today layout.
- [x] Keep the control easy to reach on phone-sized screens.
- [x] Preserve clear context for what green, yellow, and red mean after the move.

## Acceptance Criteria

- [x] `Pace Dial` appears near the top of Today, immediately after the app shell/navigation area.
- [x] A user can choose the day mode without first scrolling through the main content stack.
- [x] The relocated control still feels integrated with the Today flow rather than detached from it.

## Implementation Notes

- Main surface: `src/app/(app)/today/page.tsx`
- Re-check mobile and tablet ordering after the move; the task is about real layout priority, not only DOM order.
