# Spec Conformance Audit

Date: `2026-03-21`

Status note:
- This audit predates the `2026-03-28` schedule-doc rewrite that replaced the retired architecture draft with `specs/beside-you-technical-architecture.md`.
- Treat architecture-drift findings here as historical context for that earlier repo state.

Scope:
- `specs/beside-you-prd.md`
- `specs/beside-you-technical-architecture.md`
- runtime-aware repo docs: `AGENTS.md`, `docs/product-behavior.md`, `docs/architecture.md`
- application/domain/persistence/runtime code
- existing automated test coverage in `tests/*`

Precedence used for this audit:
- Product behavior is the source of truth.
- The PRD and current runtime-aware repo docs define required behavior.
- The technical architecture doc is treated as a draft that can drift structurally; structural mismatches are logged as `doc_drift` unless they create a product-level behavior mismatch.

Verification baseline:
- The user reported `npm run verify` and `npm run build:webpack` are passing in their environment.
- I did not rerun those commands in the sandbox.
- A narrow `npx vitest run tests/backlog.test.ts` verification attempt was blocked locally by the sandbox install state missing Rollup's optional native package `@rollup/rollup-linux-x64-gnu`.

## Verdict

Current state after this audit:
- No remaining code-level logic gaps were found in the locally reviewable product flows covered below.
- One real overrun flow defect was found and fixed during this audit: the Today view's `Keep it visible` branch now persists the shifted next-block timing instead of only showing the preview copy.
- The technical architecture doc has material drift from the current runtime-aware implementation and should not be used as an exact structural map of the repo.
- Several Supabase/device-specific requirements still require user-run live proof. Those are listed under `blocked_live_proof`.

## Traceability Matrix

| Area | Spec refs | Primary implementation | Evidence | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Workbook and quote source data | `SCHED-1` through `SCHED-6`, `TODAY-5` through `TODAY-8`, `QUOTE-1` through `QUOTE-7` | `scripts/generate-static-data.mjs`, `src/lib/generated/schedule-data.ts`, `src/lib/generated/quotes-data.ts` | `tests/generated-data.test.ts:13`, `tests/quotes.test.ts:33` | `aligned` | Generated schedule, GT plan, subject metadata, and quotes are tied back to repo workbook/CSV sources. |
| Runtime selection and auth boundary | runtime rules in `AGENTS.md`, sync requirements `SYNC-1` through `SYNC-3` | `src/lib/runtime/mode.ts`, `src/lib/auth/session.ts`, `proxy.ts`, `src/lib/supabase/proxy.ts` | code inspection plus runtime-aware docs | `aligned` | Local and Supabase runtimes are cleanly isolated at auth/persistence/sync boundaries. |
| Persistence, export, and shared state model | `SET-4`, `NFR-4`, runtime rules in `AGENTS.md` | `src/lib/data/local-store.ts`, `src/app/api/export/route.ts` | code inspection, `docs/architecture.md` | `aligned` | Export reads through `readStore()` and therefore uses the active runtime store rather than a mock cache. |
| Today view structure, quote routing, traffic-light semantics, wind-down timing | `TODAY-1` through `TODAY-33`, `BACK-8` through `BACK-18` | `src/app/(app)/today/page.tsx`, `src/lib/domain/today.ts`, `src/lib/domain/quotes.ts`, `src/lib/domain/schedule.ts`, `src/lib/data/app-state.ts` | `tests/today.test.ts:12`, `tests/backlog.test.ts:26`, `tests/quotes.test.ts:46` | `aligned` | Inline separators, hidden `Rescheduled` cards, salvage copy, quote restoration, and wind-down timing all match the product behavior. |
| Backlog creation, queue semantics, assigned recovery lifecycle | `BACK-1` through `BACK-18`, `BACK-36` through `BACK-41` | `src/lib/data/app-state.ts`, `src/lib/domain/backlog-queue.ts`, `src/app/(app)/backlog/page.tsx` | `tests/backlog.test.ts:101`, `tests/backlog.test.ts:232` | `aligned` | `morning_revision` stays out of the queue, neutral source tags are preserved, rescheduled recovery stays linked to destination block lifecycle. |
| Overrun handling and sleep protection | `TODAY-25`, `BACK-19` through `BACK-22`, `docs/product-behavior.md:74-76` | `src/lib/domain/backlog.ts`, `src/components/app/time-editor.tsx`, `src/lib/server/actions.ts`, `src/lib/data/app-state.ts` | `tests/backlog.test.ts:150`, `tests/backlog.test.ts:196`, `tests/backlog.test.ts:218` | `fixed_during_audit` | The `Keep it visible` branch now persists shifted timing for the next affected block. Forced backlog protection after `23:00` was already correct. |
| Revision derivation and retroactive reconciliation | `SCHED-12`, `BACK-29` through `BACK-35`, success criterion `2` | `src/lib/domain/schedule.ts`, `src/lib/server/actions.ts` | `tests/schedule.test.ts:126`, `tests/schedule.test.ts:140`, `tests/schedule.test.ts:204`, `tests/schedule.test.ts:218` | `aligned` | Revision anchors fall back to mapped dates until actual completion exists, move when completion is late, and impossible old checkoffs are removed. |
| Schedule shift logic and hard boundary | `BACK-23` through `BACK-28`, `SCHED-6` | `src/lib/domain/schedule.ts`, `src/lib/data/app-state.ts`, `src/components/app/schedule-shift-panel.tsx` | `tests/shift.test.ts:45` | `aligned` | Suggestion threshold, earliest anchor, Day 84 buffer, compression order, backlog clearing, GT remap, and August 20 hard-stop behavior are covered. |
| Schedule browser and retro editability | `BROWSE-1` through `BROWSE-7`, `BACK-32` through `BACK-35` | `src/app/(app)/schedule/page.tsx`, `src/app/(app)/schedule/[day]/page.tsx`, `src/lib/domain/schedule.ts`, `src/lib/data/app-state.ts` | `tests/schedule-browser.test.ts:32` | `aligned` | Past days allow retro completion only, future days are read-only, shift-hidden days stay visible and read-only, original planned dates remain visible after shifts. |
| MCQ forms and analytics | `MCQ-1` through `MCQ-14`, reference data in section `18` | `src/lib/domain/mcq.ts`, `src/app/(app)/mcq/*`, `src/components/app/mcq-*.tsx` | `tests/mcq.test.ts:20` | `aligned` | Canonical subjects, cause/priority/fix/tag vocabularies, wrong-count derivation, session-state persistence behavior, and analytics all align. |
| GT forms and analytics | `GT-1` through `GT-12` | `src/lib/domain/gt.ts`, `src/app/(app)/gt/*`, `src/components/app/gt-entry-form.tsx` | `tests/gt.test.ts:20` | `aligned` | Workbook GT schedule, shifted GT mapping, five-section review, wrapper normalization, comparison analytics, and repeated weakness tracking align. |
| Weekly summaries | `WEEK-1` through `WEEK-8` | `src/lib/domain/weekly.ts`, `src/lib/data/app-state.ts`, `src/app/(app)/weekly/*` | `tests/weekly.test.ts:26` | `aligned` | Manual partial snapshots, Sunday `23:30` automation, week-key upsert behavior, and payload contents align with the required summary model. |
| Settings, PWA, offline handling, quiet-product guardrails | `SET-1` through `SET-5`, `DESIGN-12` through `DESIGN-16`, `SYNC-2`, `NOTIF-1` through `NOTIF-13`, `NO-6`, `NO-7` | `src/app/(app)/settings/page.tsx`, `src/app/manifest.ts`, `public/sw.js`, `src/lib/domain/pwa.ts`, `src/components/app/install-status-card.tsx` | `tests/pwa.test.ts:8`, `tests/release-guardrails.test.ts:42` | `aligned` | Manifest, install guidance, offline fallback, and no-push/no-reminder guardrails are all implemented in the intended quiet, online-first form. |
| Supabase realtime sync, cron routes, and multi-device stability | `SYNC-1` through `SYNC-3`, cron rules in `AGENTS.md` | `src/components/app/sync-status.tsx`, `src/lib/server/automation-jobs.ts`, `src/app/api/cron/*`, `src/app/api/keep-alive/route.ts`, Supabase migrations | code inspection only | `blocked_live_proof` | Source looks aligned, but real cross-device sync, degraded badge behavior, quote stability across sessions, and cron idempotence still need hosted runtime proof. |

## Findings

### 1. Fixed During Audit: Overrun `Keep it visible` path did not persist the shifted next-block timing

Severity: `high`

Spec basis:
- `specs/beside-you-prd.md:294-297`
- `docs/product-behavior.md:74-76`

What was wrong:
- The Today time editor already showed a decision UI when an edited block overran into the next pending visible block.
- The user-facing branch `Keep it visible` only saved the edited block's own `actualStart` and `actualEnd`.
- The affected next block never received the shifted timing that the UI claimed it would now use.

Why this mattered:
- The visible flow promised a real decision between keeping the downstream block visible or moving overflow to backlog.
- Without persisting the next block's shifted timing, the UI copy and state mutation diverged.

Fix applied:
- Added `applyOverrunCascadeShift()` in `src/lib/data/app-state.ts`.
- Wired `src/components/app/time-editor.tsx` to submit an explicit `keep_next_visible` decision when the user picks `Keep it visible`.
- Updated `src/lib/server/actions.ts` so the time-edit mutation persists the shifted timing on the affected next block.
- Added regression coverage in `tests/backlog.test.ts`.

Relevant code:
- `src/lib/data/app-state.ts`
- `src/lib/server/actions.ts`
- `src/components/app/time-editor.tsx`
- `tests/backlog.test.ts`

### 2. Architecture Document Drift: `specs/beside-you-technical-architecture.md` no longer matches the repo structure or runtime model

Severity: `medium`

This is not a product-behavior failure by itself, but it is large enough to mislead future implementation work.

Concrete drift examples:
- File tree drift:
  - The draft architecture still describes a hook-heavy structure with `src/hooks/*`, `src/components/today/traffic-light.tsx`, and `middleware.ts` (`specs/beside-you-technical-architecture.md:367-376`, `1215-1243`).
  - The repo now uses a runtime-aware `domain/data/server` split plus `proxy.ts`; see `AGENTS.md` and `docs/architecture.md`.
- Database model drift:
  - The draft architecture still specifies `schedule_days`, `study_blocks`, `block_completions`, `revision_queue`, and a shared `quotes` table (`specs/beside-you-technical-architecture.md:442-704`, `711-808`).
  - The current implementation persists a consolidated `UserState` across tables like `app_settings`, `day_states`, `block_progress`, `revision_completions`, `backlog_items`, `mcq_*`, `gt_logs`, `weekly_summaries`, and persisted `quote_state`; see `src/lib/data/local-store.ts` and the actual migrations under `supabase/migrations/`.
- Automation/runtime drift:
  - The draft architecture still points to Supabase Edge Function endpoints like `/functions/v1/midnight-cron` and `/functions/v1/weekly-summary` (`specs/beside-you-technical-architecture.md:2230-2258`).
  - The repo now runs authenticated Next route cron handlers at `src/app/api/cron/midnight/route.ts` and `src/app/api/cron/weekly/route.ts`, with keep-alive at `src/app/api/keep-alive/route.ts`.
- Today/realtime flow drift:
  - The draft architecture's Today data flow and realtime examples assume direct Supabase reads and a legacy `use-realtime.ts` hook (`specs/beside-you-technical-architecture.md:1161-1191`, `2313-2359`).
  - The repo now uses server-first page reads plus the dedicated client sync island in `src/components/app/sync-status.tsx`.

Recommendation:
- Treat `specs/beside-you-technical-architecture.md` as a historical draft until it is rewritten to match the runtime-aware architecture already documented in `AGENTS.md` and `docs/architecture.md`.

## Blocked Live Proof

These items look correct in source, but static review is not enough to claim strict end-to-end conformance:

1. Supabase realtime sync across two live sessions.
   - Required proof: traffic-light, block progress, MCQ, GT, and theme changes reflect within seconds on a second browser/device.

2. Quiet degraded-sync state.
   - Required proof: disconnect/reconnect produces only `No connection` and `Sync reconnecting`, then recovers cleanly.

3. Hosted cron idempotence.
   - Required proof: repeated calls to `/api/cron/midnight` and `/api/cron/weekly` do not duplicate state and the job ledger remains sane.

4. Cross-device quote stability in Supabase mode.
   - Required proof: the same date/category shows the same quote on both sessions after refresh.

5. Device installability and offline fallback on actual target hardware.
   - Required proof: Safari Add to Home Screen, Chromium install prompt/menu install, and quiet offline fallback behavior on iPhone/iPad and Android/tablet.

6. Visual and performance expectations that require a real browser/device pass.
   - iPhone SE width handling
   - 11-inch tablet presentation
   - Today route perceived load time
   - calm placeholders instead of spinner-heavy interaction in real navigation

## User-Run Validation Still Recommended

To close the remaining `blocked_live_proof` items, the highest-value manual pass is:

1. Run the existing release smoke flow in `docs/release-smoke-test.md`.
2. In `supabase` mode, verify two-session sync for traffic-light, block progress, MCQ, GT, settings/theme, and quote stability.
3. Call both cron routes twice with the same week/day state and confirm idempotent results.
4. Exercise the repaired overrun branch:
   - edit a block so it spills into the next visible block
   - choose `Keep it visible`
   - confirm the next block's displayed timing shifts
   - repeat with `Move overflow to backlog`
   - repeat with a `23:00` breach and confirm forced backlog

## Files Changed During This Audit

- `src/lib/data/app-state.ts`
- `src/lib/server/actions.ts`
- `src/components/app/time-editor.tsx`
- `tests/backlog.test.ts`

Note:
- `tsconfig.json` was already dirty in the worktree and was not part of this audit change.
