# Beside You

Mobile-first NEET PG 2026 study companion built with Next.js App Router.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Generate the static schedule and quotes modules:

```bash
npm run generate:data
```

3. Start the app:

```bash
npm run dev
```

4. Choose a runtime in `.env.local`.

For immediate local testing:

```env
BESIDE_YOU_RUNTIME=local
```

For the hosted/shared-state path:

```env
BESIDE_YOU_RUNTIME=supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=...
```

5. Log in with the active runtime credentials.

Default local credentials:

- Email: `aspirant@beside-you.local`
- Password: `beside-you-2026`

## What’s Included

- Runtime-aware local and Supabase-backed modes
- Build-time schedule and quote generation from the provided workbook/CSV with workbook validation
- Today view, traffic light system, backlog queue, schedule browser, MCQ logging, GT logging, weekly summaries, export
- Dev-only time travel controls for 22:30 / 23:00 / 23:15 / midnight behavior
- Supabase auth, persistence, RLS, and Realtime integration path for shared-state deployment
- Production cron routes for IST midnight rollover and weekly summary automation
- Job telemetry in `automation_job_runs` plus manual cron setup SQL for Supabase
- Workbook-derived block templates from `Block_Hours` plus regression tests that compare generated data back to the source workbook

## Core Commands

```bash
npm run dev
npm run generate:data
npm run lint
npm run typecheck
npm test
npm run verify
```

## Docs

- [AGENTS.md](./AGENTS.md)
- [docs/architecture.md](./docs/architecture.md)
- [docs/local-development.md](./docs/local-development.md)
- [docs/testing.md](./docs/testing.md)
- [docs/deployment.md](./docs/deployment.md)
- [docs/operations.md](./docs/operations.md)
- [docs/product-behavior.md](./docs/product-behavior.md)
