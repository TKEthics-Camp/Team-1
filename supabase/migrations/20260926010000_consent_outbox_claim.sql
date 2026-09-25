-- Each consent email is sent once, even if two worker runs overlap.
--
-- The worker used to select unsent rows, send them, then mark them sent. Two
-- runs that overlapped — a slow provider, a cron tick landing mid-batch —
-- both saw the same unsent rows and both sent them, so a parent got the same
-- "let your child use this app" email twice. That reads as spam at best and
-- a phishing attempt at worst, and a parent who distrusts the first email
-- never gets as far as the second.
--
-- Now a run claims its rows before sending: one statement that locks them,
-- skips any another run already holds (SKIP LOCKED), and stamps claimed_at.
-- A second run simply gets different rows, or none.
--
-- A claim goes stale after ten minutes. A worker that crashes mid-batch must
-- not strand a parent's email forever; after ten minutes the next run picks
-- it up again.

alter table public.consent_outbox
  add column if not exists claimed_at timestamptz;

create or replace function public.claim_consent_outbox(p_limit int default 25)
returns setof public.consent_outbox
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.consent_outbox o
  set claimed_at = now()
  where o.id in (
    select id from public.consent_outbox
    where sent_at is null
      and send_after <= now()
      and attempts < 5
      and (claimed_at is null or claimed_at < now() - interval '10 minutes')
    order by send_after
    limit greatest(1, least(p_limit, 100))
    for update skip locked
  )
  returning o.*;
$$;

-- Only the worker, which holds the service role key, may claim. Nothing a
-- signed-in child or a guardian's browser can reach should ever be able to
-- read a live consent token out of this table.
revoke all on function public.claim_consent_outbox(int) from public, anon, authenticated;
grant execute on function public.claim_consent_outbox(int) to service_role;

notify pgrst, 'reload schema';
