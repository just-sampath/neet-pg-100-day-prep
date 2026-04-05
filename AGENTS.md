# Beside You Agent Guide

This repo is a single-user NEET PG 2026 study companion. The codebase now has a runtime-aware persistence boundary:

- `local` mode exists for immediate local testability
- `supabase` mode is the hosted shared-state path for auth, persistence, and realtime sync

The product goal is still one quiet, supportive companion for one aspirant across two devices.

## Product Goal

- Show the user exactly what to do today.
- Track block-by-block completion against a fixed 100-day plan.
- Handle yellow/red days and backlog gently.
- Recompute revision work from actual usage, not only from the original Excel plan.
- Log MCQ and GT performance with fast input and readable trends.
- Stay intentionally silent: no push notifications, no proactive reminder system.

## Preferred Engineering Patterns

- Server-first reads, small client islands.
- Keep mutations in `src/lib/server/actions.ts` unless a new file materially improves clarity.
- Avoid duplicating domain logic in pages. Add helper functions to `src/lib/domain/*` or `src/lib/data/app-state.ts`.
- Keep generated data committed so the repo works immediately after clone.
- If you change workbook parsing, rerun `npm run generate:data`.
- Treat the workbook as truth. If generation fails, fix the workbook assumptions or the parser against the workbook, not by reintroducing hidden schedule constants.
- Keep runtime branching at the persistence/auth/sync boundary; do not fork domain logic per runtime unless there is no cleaner option.

## What To Avoid

- Do not reintroduce scaffold/demo UI from `create-next-app`.
- Do not add noisy gamification or streak mechanics.
- Do not add notification infrastructure.
- Do not make the app depend on hosted services just to validate core flows in local mode.
- Do not change the traffic-light semantics casually; they are product-defining behavior.

## Known Tradeoffs

- Local mode still exists because it keeps the repo fully runnable without hosted infra.
- Supabase mode is now implemented for auth, persistence, and realtime sync, but later production gates still remain in `todos/`.
- Local mode still simulates scheduled behavior with dev routes, while Supabase mode relies on the hosted cron path for midnight and weekly jobs.
- Conflict policy is last-write-wins via server persistence plus authoritative refresh rather than client-side record merging.
