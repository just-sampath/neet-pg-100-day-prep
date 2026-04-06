# Local Development

This repo is designed to stay runnable after clone. You can work in either:

- `local` mode for fully local testing
- `supabase` mode for hosted/shared-state behavior

## Prerequisites

- Node 20.x
- `npm install`

## First run

1. Install dependencies.
2. Generate the workbook-derived static data.
3. Start the dev server.

Core commands:

- `npm install`
- `npm run generate:data`
- `npm run dev`

For a full confidence pass before a push, use:

- `npm run verify`

## Runtime modes

### Local mode

Create `.env.local` from `.env.example` and set:

- `BESIDE_YOU_RUNTIME=local`

Default seeded local credentials:

- Email: `aspirant@beside-you.local`
- Password: `beside-you-2026`

Use this when you want immediate testability without hosted infrastructure.

### Supabase mode

Set:

- `BESIDE_YOU_RUNTIME=supabase`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

If you want local development to match hosted behavior, apply the current Supabase migrations before running the app against a real Supabase project.

Start with these core migrations:

- `supabase/migrations/0001_initial_schema.sql`
- `supabase/migrations/0002_runtime_rls_realtime.sql`
- `supabase/migrations/0003_automation_job_runs.sql`

Then continue applying the rest of the migration files in order so the schema, policies, RPCs, and indexes match the current app code.

## Notes about local storage

In `local` mode, the app uses file-backed state and writes under `.data/`. That is intentional for local testing, and the Next.js config excludes `.data/**` from dev watch loops to avoid write-triggered rebuild churn.

## Data generation

The workbook and CSV inputs are the source of truth for generated schedule and quote data. If you touch the generation logic or workbook assumptions, regenerate the committed output:

- `npm run generate:data`

Do not reintroduce hidden schedule constants in runtime code to work around generation problems.

## Suggested day-to-day loop

1. Update `.env.local` for the runtime you need.
2. Run `npm run dev`.
3. Make changes.
4. Run targeted tests while iterating.
5. Run `npm run verify` before pushing.

## When to use each mode

Use `local` mode when you want:

- quick feature work
- no hosted dependency requirement
- deterministic single-user local testing

Use `supabase` mode when you want:

- auth and shared persistence behavior
- realtime sync behavior
- automation/cron behavior close to production
- parity with the Vercel deployment flow
