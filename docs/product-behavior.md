# Product Behavior

## Traffic Light

- Green: full schedule
- Yellow: reduced day, hidden blocks moved to backlog as `yellow_day`
- Red: salvage day, only the minimum visible blocks stay, and hidden blocks move to backlog as `red_day`
- The Today timeline keeps all study blocks in chronological order even on Yellow/Red days; hidden blocks collapse in-place as neutral `Rescheduled` cards.
- Same-day upgrades restore only the blocks that become visible again.

## Backlog

- Neutral wording only
- Manual skip, midnight miss, wind-down moves, and overrun cascade create backlog items
- `morning_revision` stays out of the backlog queue and returns to the revision system instead
- Each backlog item preserves its original slot timing so the queue can show where it came from
- Backlog suggestions depend on block type

## Revision Queue

- Built from `block_a` and `block_b` anchors plus actual completion shifts
- Actual completion date in IST wins; mapped planned date is fallback only
- Max 5 morning items
- Overflow goes to night recall then break micro-slots
- 3+ consecutive overflow days surface the supportive overflow warning
- `1-2` days missed stay in the morning queue
- `3-6` days missed become catch-up items
- `7+` days missed become restudy flags
- Retroactive source completion moves future revision anchors and can invalidate earlier impossible revision checkoffs

## Wind-Down

- `22:30`: offer wrap-up
- `22:45`: if the `22:30` prompt was dismissed once, show one more wrap-up prompt
- `23:00`: handle night recall explicitly
- `23:15`: sweep remaining visible work to backlog
- `23:15` and manual wrap-up exclude `morning_revision` from the backlog queue
- midnight: mark pending blocks as missed

## Overrun Handling

- Editing a block later can preview the next affected visible block.
- If the spill is still sleep-safe, the user can keep the next block visible or move that overflow to backlog.
- If the spill would push the day past `23:00`, the remaining affected tail is forced into backlog to protect sleep.

## Today View

- Morning revision shows individual rows with equal time-per-item display.
- Break and meal slots stay visible as thin separators between study blocks.
- The Today screen includes a direct MCQ quick-log entry point.
- Completion uses a quiet celebration treatment rather than a loud success screen.
