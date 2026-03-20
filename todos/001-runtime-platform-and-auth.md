# 001 Runtime Platform And Auth

- [x] Task complete

## Why This Exists

The current app runs primarily on cookie plus file-backed local state. The production architecture requires Supabase auth, Postgres persistence, HTTP-only sessions, and row-level security.

## Spec Coverage

- PRD: Sections 3, 15, 16
- Architecture: Sections 5, 6, 7, 27

## Current Gap

- Closed in code. The app now uses a runtime-aware auth and persistence boundary that can read and write the same `UserState` model from Supabase or the explicit local fallback.

## Checklist

- [x] Make Supabase the default runtime for auth and mutable data when configured.
- [x] Replace file-backed app state reads with Postgres-backed read models.
- [x] Replace file-backed mutations with DB-backed server actions.
- [x] Use `supabase.auth.signInWithPassword()` for the real login flow.
- [x] Refresh sessions on each request through the current Next.js auth boundary pattern.
- [x] Enforce RLS on every user-owned table.
- [x] Confirm the single-user setup flow still works with seeded credentials.
- [x] Preserve a dev-only local mode only if it remains clearly separated from production mode.
- [x] Ensure export reads from the real persisted state, not from local fallback data.
- [x] Update environment-variable handling and failure states for missing Supabase config.

## Acceptance Criteria

- [x] A hosted environment can log in, persist a session, refresh, and remain signed in.
- [x] Two devices signed in with the same credentials read and write the same state.
- [x] No production path depends on `.data/local-store.json`.
- [x] RLS prevents cross-user reads and writes.
- [x] Setup, logout, re-login, and data export all work against Supabase.

## Implementation Notes

- Runtime resolution lives in `src/lib/runtime/mode.ts`.
- Session handling now routes through `src/lib/auth/session.ts` and `proxy.ts`.
- Mutable state hydration/persistence now routes through `src/lib/data/local-store.ts`, which reads Supabase tables in Supabase mode and `.data/local-store.json` only in explicit local mode.
- Additional RLS/runtime metadata lives in `supabase/migrations/0002_runtime_rls_realtime.sql`.
