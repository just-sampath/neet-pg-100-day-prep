# 007 Traffic Light And Backlog Creation

- [ ] Task complete

## Why This Exists

Green, yellow, and red days are central product behavior. The exact visible blocks and backlog creation paths must match the PRD because they define how the app responds to real-life disruption.

## Spec Coverage

- PRD: Sections 5.3, 6.1, 6.2, 6.3, 6.4, 6.8
- Architecture: Sections 11, 12.1, 12.3, 12.4

## Current Gap

- Core traffic-light toggling works, but some backlog creation paths and exact UI behavior are simplified.
- Overrun cascade and some metadata expectations are incomplete.

## Checklist

- [ ] Enforce the exact green visible block set.
- [ ] Enforce the exact yellow visible and hidden block set.
- [ ] Enforce the exact red visible and hidden block set.
- [ ] Create backlog items with the correct reason and source metadata when blocks are hidden.
- [ ] Restore same-day hidden blocks correctly if the user returns to green on the same day.
- [ ] Support manual skip with correct backlog metadata.
- [ ] Support midnight auto-miss with correct backlog metadata.
- [ ] Support wind-down auto-move with correct backlog metadata.
- [ ] Support overrun-triggered backlog creation with correct metadata.
- [ ] Keep all copy emotionally neutral and supportive.
- [ ] Test switching traffic-light state mid-day without corrupting completion state.

## Acceptance Criteria

- [ ] Yellow and red modes hide only the blocks specified by the PRD.
- [ ] Returning to green on the same day restores the right blocks without data loss.
- [ ] Every backlog item carries enough metadata to explain how it was created.
- [ ] Traffic-light changes never frame the user as failing.
