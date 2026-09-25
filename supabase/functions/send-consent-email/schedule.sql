-- Runs the consent email worker every five minutes.
--
-- Apply this AFTER `supabase functions deploy send-consent-email`, and after
-- 20260918000000 has created consent_outbox. Before both, this schedules a
-- call to a function that does not exist yet, which fails quietly every five
-- minutes forever.
--
-- WHY THE KEY GOES IN VAULT
-- The worker is deployed with JWT verification on, so whatever calls it has
-- to present the service role key. Postgres is doing the calling, so the key
-- has to live somewhere Postgres can read — and the one place that is not a
-- plaintext column is Vault. Do not put the key directly in the cron body:
-- cron.job is readable by anyone who can read the catalog.
--
-- The key below is YOUR service role key, from the Supabase dashboard under
-- Project Settings → API. Nobody else should ever see it, including whoever
-- helped you write this file.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Replace both placeholders, then run. Re-running is safe: the secret is
-- replaced and the job is unscheduled before being scheduled again.
do $$
declare
  v_key text := 'PASTE_YOUR_SERVICE_ROLE_KEY_HERE';
  v_ref text := 'PASTE_YOUR_PROJECT_REF_HERE';
begin
  if v_key like 'PASTE%' or v_ref like 'PASTE%' then
    raise exception 'fill in the service role key and project ref first';
  end if;

  -- One secret, replaced rather than duplicated on a re-run.
  delete from vault.secrets where name = 'consent_worker_key';
  perform vault.create_secret(v_key, 'consent_worker_key',
    'service role key used by the consent email cron');

  perform cron.unschedule('send-consent-email')
  where exists (select 1 from cron.job where jobname = 'send-consent-email');

  perform cron.schedule(
    'send-consent-email',
    '*/5 * * * *',
    format($job$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret from vault.decrypted_secrets
            where name = 'consent_worker_key'
          )
        ),
        body := '{}'::jsonb
      );
    $job$, 'https://' || v_ref || '.supabase.co/functions/v1/send-consent-email')
  );
end
$$;

-- Confirm it is scheduled.
select jobname, schedule, active from cron.job where jobname = 'send-consent-email';

-- Useful later, when something has not arrived:
--   select id, step, to_address, send_after, sent_at, attempts, last_error
--   from public.consent_outbox order by created_at desc limit 20;
