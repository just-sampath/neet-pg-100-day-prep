# 006 Today View And Wind-Down

- [ ] Task complete

## Why This Exists

The Today screen is the core product surface. It must match the PRD exactly enough that the user can rely on it as the single source of what to do now.

## Spec Coverage

- PRD: Section 5, Section 14.1, Section 14.2
- Architecture: Sections 3, 10, 14, 23, 24

## Current Gap

- The screen is strong visually, but several functional details are still simplified or missing.
- Break separators, MCQ quick-log access, exact revision timing display, and some celebration and salvage details are still incomplete.

## Checklist

- [ ] Match the Today header content and order to the spec.
- [ ] Keep the quote block integrated with the traffic-light state.
- [ ] Show the traffic-light selector with the right supportive copy and state transitions.
- [ ] Render morning revision as individual checklist rows with time-per-item display.
- [ ] Render study blocks in chronological order with break and meal separators.
- [ ] Add the MCQ quick-log entry point directly on the Today screen.
- [ ] Keep the backlog indicator visible and accurate.
- [ ] Implement the completion celebration exactly enough to feel distinct but not noisy.
- [ ] Ensure the red-day experience reads as salvage mode, not failure mode.
- [ ] Preserve the existing easter egg behavior.
- [ ] Implement 22:30, 23:00, and 23:15 wind-down behavior exactly as specified.
- [ ] Verify the screen works cleanly on phone and tablet breakpoints.

## Acceptance Criteria

- [ ] A user can complete the full day from the Today screen without hunting for missing controls.
- [ ] All time-based prompts appear at the right moments in local simulation and hosted runtime.
- [ ] The screen is readable, calm, and accurate on iPhone-sized and tablet-sized layouts.
- [ ] No generic dashboard leftovers remain in the main flow.
