# Operations Guide

This document covers the minimum operational knowledge for the hosted deployment path.

## Runtime expectations

For real hosted usage, run the app in `supabase` mode. That requires:

- `BESIDE_YOU_RUNTIME=supabase`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

`local` mode is still useful for smoke tests, but it is not the durable production path.

## Database migrations

Keep the database aligned with the entire contents of `supabase/migrations/`.

Important milestones in the current migration history include:

- `supabase/migrations/0001_initial_schema.sql`
- `supabase/migrations/0002_runtime_rls_realtime.sql`
- `supabase/migrations/0003_automation_job_runs.sql`
- `supabase/migrations/0009_app_settings_state_version.sql`
- `supabase/migrations/0010_app_settings_write_lock.sql`
- `supabase/migrations/0011_atomic_state_mutation_rpc.sql`
- `supabase/migrations/0014_fix_atomic_rpc_state_version_ambiguity.sql`
- `supabase/migrations/0018_rls_subselect_optimization.sql`
- `supabase/migrations/0019_partial_indexes_performance.sql`

Do not cherry-pick only the “interesting” migrations in production. Apply the full ordered set.

## Cron jobs

The repo ships with a Vercel cron definition in `vercel.json`.

Operational implications:

- the cron entry targets `/api/keep-alive`
- cron authorization depends on `CRON_SECRET`
- automation jobs depend on the Supabase admin path, which requires `SUPABASE_SERVICE_ROLE_KEY`

If either the cron secret or Supabase admin secret is missing, cron-related health checks and automation flows will fail.

## Deployment health checklist

After every significant deployment, confirm:

- the build completed successfully
- `npm run generate:data` did not fail during the build
- the login screen loads
- `/today` renders after login
- Supabase-backed actions do not fail due to missing env vars
- the cron route is not returning unauthorized or configuration errors

## Common failure patterns

### Missing runtime env vars

Symptoms:

- startup errors in `supabase` mode
- missing-env messages after login or during server actions
- cron failures in hosted environments

Check that all hosted env vars are present and scoped correctly in Vercel.

### Out-of-date Supabase schema

Symptoms:

- runtime queries fail unexpectedly
- RPC calls fail
- automation jobs error even though env vars look correct

Check that the live database has every migration applied, especially the foundational hosted-path migrations such as `supabase/migrations/0001_initial_schema.sql`, `supabase/migrations/0002_runtime_rls_realtime.sql`, and `supabase/migrations/0003_automation_job_runs.sql`.

### Local-mode persistence assumptions in hosted environments

Symptoms:

- data appears to “reset” after redeploys or host restarts
- expected shared-state behavior never appears

Hosted durability requires the `supabase` runtime. `local` mode is not the production persistence path.

## Safe operating habits

- run `npm run verify` before major deploys
- keep environment variables synchronized between Preview and Production when appropriate
- apply migrations before troubleshooting application logic
- verify cron secrets before assuming the route code is broken
- treat the workbook-derived generated data as build-time truth and regenerate it deliberately
