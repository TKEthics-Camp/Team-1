-- Crash reports, so a crash is found by someone other than the child it
-- happened to (PRD §14.10).
--
-- WHAT IS KEPT
-- The error's message and stack, which screen it happened on (with record
-- ids blanked out by the app), the app's version, and web or iPhone. Never
-- anything the student wrote, photographed or recorded. Tied to the
-- account so the report goes when the account does.
--
-- WHO CAN READ IT
-- Nobody through the app. There is no select policy and no grant: reports
-- are read in the Supabase dashboard, by whoever runs the project.
--
-- HOW LONG
-- 90 days. Every new report clears out anything older, so nothing needs a
-- scheduled job.
--
-- LIMITS
-- The only way in is report_crash(), which trims every field and accepts at
-- most 20 reports per account per day, so a crash loop on one phone can't
-- flood the table.

create table if not exists public.crash_reports (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  user_id    uuid not null references public.users(id) on delete cascade,
  message    text not null,
  stack      text,
  "where"    text,
  version    text,
  platform   text
);

create index if not exists crash_reports_at_idx on public.crash_reports (at);
create index if not exists crash_reports_user_at_idx on public.crash_reports (user_id, at);

alter table public.crash_reports enable row level security;
-- No policies: only report_crash() below and the service role touch it.
revoke all on public.crash_reports from anon, authenticated;

create or replace function public.report_crash(
  p_message  text,
  p_stack    text default null,
  p_where    text default null,
  p_version  text default null,
  p_platform text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or coalesce(trim(p_message), '') = '' then
    return false;
  end if;
  -- A deleted account's last moments can arrive after the row is gone.
  if not exists (select 1 from public.users where id = uid) then
    return false;
  end if;
  if (select count(*) from public.crash_reports
      where user_id = uid and at > now() - interval '1 day') >= 20 then
    return false;
  end if;

  delete from public.crash_reports where at < now() - interval '90 days';

  insert into public.crash_reports (user_id, message, stack, "where", version, platform)
  values (
    uid,
    left(p_message, 500),
    left(p_stack, 4000),
    left(p_where, 200),
    left(p_version, 40),
    left(p_platform, 20)
  );
  return true;
end;
$$;

revoke all on function public.report_crash(text, text, text, text, text) from public, anon;
grant execute on function public.report_crash(text, text, text, text, text) to authenticated;
