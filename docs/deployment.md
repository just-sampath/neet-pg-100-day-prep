# Deployment Guide

This project is a Next.js App Router application with two runtime modes:

- `local`: fast smoke-test mode with file-backed state
- `supabase`: the real hosted mode for auth, persistence, realtime sync, and cron-backed automation

For Vercel, the recommended path is **`supabase` mode**. The `local` mode is still useful for a quick preview, but it is not a durable hosted setup because local-mode writes use `.data/local-store.json`.

## Recommended deployment path

Use the Vercel dashboard with a GitHub-connected repository:

1. Push the repo to GitHub.
2. Import the repository into Vercel.
3. Let Vercel auto-detect **Next.js**.
4. Add the required environment variables.
5. Deploy a preview first.
6. Promote the production branch once the preview is healthy.

This gives you the cleanest long-term workflow: every branch gets a Preview deployment, and your production branch publishes the live site.

## Before you deploy

### 1. Verify the project locally

Run the repo verification command before connecting Vercel:

- `npm install`
- `npm run verify`

The build script already runs `npm run generate:data && next build`, so you do **not** need a custom Vercel build command unless you intentionally override Vercel defaults.

### 2. Choose the runtime mode

#### Quick UI smoke test

Set only:

- `BESIDE_YOU_RUNTIME=local`

Use this when you only want to confirm that the app boots on Vercel.

#### Real hosted deployment

Set:

- `BESIDE_YOU_RUNTIME=supabase`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

This is the correct mode for shared state across devices.

## Supabase preparation

Before the first real deployment, create a Supabase project and apply the current migrations in `supabase/migrations/`.

At a minimum, the hosted deployment relies on these foundational migrations:

- `supabase/migrations/0001_initial_schema.sql`
- `supabase/migrations/0002_runtime_rls_realtime.sql`
- `supabase/migrations/0003_automation_job_runs.sql`

Do not stop there: apply the **entire current migration folder in order** so the database matches the current codebase.

## Vercel dashboard flow

### 1. Import the repository

In the Vercel dashboard:

1. Click **Add New** → **Project**.
2. Select **Import Git Repository**.
3. Choose this repository.
4. Select the correct personal account or team.
5. Keep the **Root Directory** at the repository root.

### 2. Confirm project settings

Recommended settings for this repo:

- **Framework Preset**: `Next.js`
- **Root Directory**: repository root
- **Install Command**: leave automatic, or use `npm install`
- **Build Command**: leave automatic, or use `npm run build`
- **Output Directory**: leave blank
- **Node.js version**: Node 20.x (matches the repo requirement)

### 3. Add environment variables

Add the variables in the Vercel project settings before the first serious deployment.

| Variable | Required for local preview | Required for Supabase deploy | Notes |
| --- | --- | --- | --- |
| `BESIDE_YOU_RUNTIME` | Yes | Yes | Use `local` for smoke tests, `supabase` for real hosted use |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Yes | Public Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Yes | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Yes | Server-only secret used by automation jobs |
| `CRON_SECRET` | No | Yes | Must match the cron authorization check |

Recommended scopes:

- **Production**: yes
- **Preview**: yes
- **Development**: optional, but helpful if you later pull env vars locally with the Vercel CLI

### 4. Deploy

Start with a Preview deployment. Once the preview is healthy:

- open the login page
- log in with the correct runtime credentials
- confirm `/today` renders
- only then merge or push to the production branch

## Cron and automation notes

This repo already includes a Vercel cron definition in `vercel.json` for `/api/keep-alive`.

Important caveats:

- the cron route expects `Authorization: Bearer ${CRON_SECRET}`
- the automation code requires both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- cron-backed automations are only meaningful in `supabase` mode

If `CRON_SECRET` is missing, the cron route returns a configuration error. If the Supabase admin credentials are missing, hosted automation jobs cannot run.

## CLI alternative

If you prefer terminal-based deployment after the dashboard setup is working:

1. Install the CLI with `npm i -g vercel`
2. Authenticate with `vercel login`
3. Link the project with `vercel link`
4. Pull env vars locally with `vercel env pull .env.local` if needed
5. Create a preview with `vercel deploy`
6. Create a production deployment with `vercel deploy --prod`

For a beginner, the Git-connected dashboard flow is still the easiest path.

## Post-deploy checklist

After the first successful deployment:

- confirm the site loads on the Vercel URL
- confirm login works
- confirm `/today` renders without missing-env errors
- confirm the Vercel deployment log includes a successful `generate:data` step before `next build`
- confirm Preview deployments are created for non-production branches
- confirm the cron route is correctly authorized in hosted mode

## Troubleshooting

### Build fails before Next.js starts

Check the output from `npm run generate:data`. This repo generates committed/static reference data at build time, and that generation must succeed before the Next.js build can finish.

### The app deploys but state does not persist

You are probably using `BESIDE_YOU_RUNTIME=local`. That mode is for local development and quick smoke tests, not durable hosted persistence.

### Cron requests fail

Check these first:

- `CRON_SECRET` is set in Vercel
- `NEXT_PUBLIC_SUPABASE_URL` is set
- `SUPABASE_SERVICE_ROLE_KEY` is set
- the Supabase migrations were applied in order, including `supabase/migrations/0001_initial_schema.sql`, `supabase/migrations/0002_runtime_rls_realtime.sql`, and `supabase/migrations/0003_automation_job_runs.sql`
