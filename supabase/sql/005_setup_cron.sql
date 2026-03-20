-- Run this manually after:
-- 1. deploying the Next.js app
-- 2. setting vault secrets:
--    - app_base_url
--    - cron_secret
--
-- Example:
--   select vault.create_secret('https://your-app.vercel.app', 'app_base_url');
--   select vault.create_secret('your-random-cron-secret', 'cron_secret');

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'beside-you-midnight-rollover';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'beside-you-midnight-rollover',
    '30 18 * * *',
    $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'app_base_url')
             || '/api/cron/midnight',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'),
        'Content-Type',
        'application/json'
      ),
      body := '{}'::jsonb
    );
    $cron$
  );
end
$$;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'beside-you-weekly-summary';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'beside-you-weekly-summary',
    '0 18 * * 0',
    $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'app_base_url')
             || '/api/cron/weekly',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'),
        'Content-Type',
        'application/json'
      ),
      body := '{}'::jsonb
    );
    $cron$
  );
end
$$;
