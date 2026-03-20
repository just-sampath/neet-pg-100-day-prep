# Deployment

## Target

Deploy the Next.js app to Vercel with `BESIDE_YOU_RUNTIME=supabase`.

Local mode remains for development and fallback testing, but the hosted shared-state path is the intended deployment runtime for auth and multi-device sync.

## Required Environment Variables

```env
BESIDE_YOU_RUNTIME=supabase
NEXT_PUBLIC_APP_URL=https://your-app-url
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Optional local-only vars such as `BESIDE_YOU_LOCAL_EMAIL` are not required for hosted Supabase mode.

## Database Setup

1. Create the Supabase project.
2. Apply migrations:

```bash
supabase db push
```

This must apply:

- `supabase/migrations/0001_initial_schema.sql`
- `supabase/migrations/0002_runtime_rls_realtime.sql`

`0002_runtime_rls_realtime.sql` is required for:

- user-scoped RLS across the mutable state tables
- `processed_dates` and `simulated_now_iso` storage in `app_settings`
- uniqueness constraints used by the runtime upsert path
- Realtime publication coverage for the subscribed tables

## Auth Setup

1. In Supabase Auth, create the single user account.
2. Give the user the seeded email/password.
3. Set optional `display_name` metadata if desired.

At runtime:

- login uses `supabase.auth.signInWithPassword()`
- `proxy.ts` refreshes the session cookie on requests
- logout uses `supabase.auth.signOut()`

## Build And Deploy

```bash
npm install
npm run generate:data
npm run build
```

On Vercel:

1. Import the repo.
2. Set the environment variables above.
3. Use the default Next.js build or:

```bash
npm run build
```

4. Deploy.

## Post-Deploy Validation

Run this immediately after the first deployment:

1. Log in on one device and refresh the page.
2. Confirm the session persists.
3. Open the same account on a second device or browser.
4. Change traffic light, complete a block, and create an MCQ or GT entry.
5. Confirm the second session updates within seconds.
6. Disable the network briefly and confirm the UI shows a quiet degraded-sync badge rather than breaking.
7. Test export from `Settings` or `GET /api/export`.

## Rollback Notes

- If Supabase env vars are removed and `BESIDE_YOU_RUNTIME` is left unset, the app will fall back to local mode.
- If you explicitly set `BESIDE_YOU_RUNTIME=supabase` without valid public Supabase env vars, the runtime should be treated as misconfigured.
- If Realtime is not behaving correctly, confirm that `0002_runtime_rls_realtime.sql` has been applied and the subscribed tables are in the `supabase_realtime` publication.
