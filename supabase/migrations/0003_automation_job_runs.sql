create table if not exists automation_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  run_key text not null,
  status text not null check (status in ('running', 'completed', 'failed')),
  timezone text not null default 'Asia/Kolkata',
  scheduled_date date not null,
  processed_users integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (job_name, run_key)
);

create index if not exists automation_job_runs_started_at_idx
  on automation_job_runs(started_at desc);

alter table if exists automation_job_runs enable row level security;

-- Service-role bypass is implicit in Supabase (service_role key bypasses RLS).
-- Deny all access for regular authenticated users by having no permissive policies.
-- Add an explicit documentation policy to make the intent clear.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'automation_job_runs'
      and policyname = 'automation_job_runs_deny_all'
  ) then
    create policy automation_job_runs_deny_all
      on automation_job_runs
      for all
      using (false);
  end if;
end
$$;
