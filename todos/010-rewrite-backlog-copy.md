# 010 Rewrite Backlog Copy

- [ ] Task complete

## Why This Exists

The current backlog language is internally consistent but not self-explanatory enough for a non-developer reading it cold. The goal here is clarity, not a redesign of the scheduling algorithm.

## Spec Coverage

- PRD: Sections 6, 14
- Architecture: Sections 12, 13

## Current Gap

- Open in code. Backlog surfaces use vague or overly stylized copy such as `No safe suggestion is available yet.` and `Remove a whole calm category at once if it no longer deserves space in the queue.`

## Checklist

- [ ] Rewrite vague suggestion and empty-state copy in plain product language.
- [ ] Rewrite bulk-action helper text so it says exactly what the action does.
- [ ] Keep the underlying backlog behavior unchanged while updating the wording.

## Acceptance Criteria

- [ ] A user can understand why a backlog item has or does not have a suggestion.
- [ ] Bulk backlog actions are understandable without product-context guessing.
- [ ] The new wording stays neutral and non-punitive.

## Implementation Notes

- Main surface: `src/app/(app)/backlog/page.tsx`
- Do not quietly change the algorithm in this task; this is a wording and trust task.
