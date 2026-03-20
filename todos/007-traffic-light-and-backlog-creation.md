# 007 Traffic Light And Backlog Creation

- [x] Task complete

## Why This Exists

Green, yellow, and red days are central product behavior. The exact visible blocks and backlog creation paths must match the PRD because they define how the app responds to real-life disruption.

## Spec Coverage

- PRD: Sections 5.3, 6.1, 6.2, 6.3, 6.4, 6.8
- Architecture: Sections 11, 12.1, 12.3, 12.4

## Current Gap

- Closed. Traffic-light restoration, backlog creation metadata, wind-down creation paths, and overrun-triggered backlog creation now match the intended task scope.

## Checklist

- [x] Enforce the exact green visible block set.
- [x] Enforce the exact yellow visible and hidden block set.
- [x] Enforce the exact red visible and hidden block set.
- [x] Create backlog items with the correct reason and source metadata when blocks are hidden.
- [x] Restore same-day hidden blocks correctly if the user returns to green on the same day.
- [x] Support manual skip with correct backlog metadata.
- [x] Support midnight auto-miss with correct backlog metadata.
- [x] Support wind-down auto-move with correct backlog metadata.
- [x] Support overrun-triggered backlog creation with correct metadata.
- [x] Keep all copy emotionally neutral and supportive.
- [x] Test switching traffic-light state mid-day without corrupting completion state.

## Acceptance Criteria

- [x] Yellow and red modes hide only the blocks specified by the PRD.
- [x] Returning to green on the same day restores the right blocks without data loss.
- [x] Every backlog item carries enough metadata to explain how it was created.
- [x] Traffic-light changes never frame the user as failing.
