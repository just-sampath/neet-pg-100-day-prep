# 006 Today View And Wind-Down

- [x] Task complete

## Why This Exists

The Today screen is the core product surface. It must match the PRD exactly enough that the user can rely on it as the single source of what to do now.

## Spec Coverage

- PRD: Section 5, Section 14.1, Section 14.2
- Architecture: Sections 3, 10, 14, 23, 24

## Current Gap

- Closed in the current implementation.

## Checklist

- [x] Match the Today header content and order to the spec.
- [x] Keep the quote block integrated with the traffic-light state.
- [x] Show the traffic-light selector with the right supportive copy and state transitions.
- [x] Render morning revision as individual checklist rows with time-per-item display.
- [x] Render study blocks in chronological order with break and meal separators.
- [x] Add the MCQ quick-log entry point directly on the Today screen.
- [x] Keep the backlog indicator visible and accurate.
- [x] Implement the completion celebration exactly enough to feel distinct but not noisy.
- [x] Ensure the red-day experience reads as salvage mode, not failure mode.
- [x] Preserve the existing easter egg behavior.
- [x] Implement 22:30, 22:45, 23:00, and 23:15 wind-down behavior exactly as specified.
- [x] Verify the screen works cleanly on phone and tablet breakpoints.

## Acceptance Criteria

- [x] A user can complete the full day from the Today screen without hunting for missing controls.
- [x] All time-based prompts appear at the right moments in local simulation and hosted runtime.
- [x] The screen is readable, calm, and accurate on iPhone-sized and tablet-sized layouts.
- [x] No generic dashboard leftovers remain in the main flow.
