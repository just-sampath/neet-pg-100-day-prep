# Product Behavior

## Traffic Light

- Green: full schedule
- Yellow: reduced day, hidden blocks moved to backlog
- Red: salvage day, only the minimum visible blocks stay

## Backlog

- Neutral wording only
- Skip/miss/reschedule create backlog items
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
- `23:00`: handle night recall explicitly
- `23:15`: sweep remaining visible work to backlog
- midnight: mark pending blocks as missed
