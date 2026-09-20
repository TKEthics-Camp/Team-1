-- Somebody can finally read the reports.
--
-- PRD §14.1 has called this a blocker since the first draft, and it was the
-- worst gap in the app: five screens let a child report something, the row
-- landed in public.reports, and reports_select_own meant the only person who
-- could ever read it was the child who filed it. A report went nowhere and
-- no adult learned it had happened. The button was a lie.
--
-- The original note said this needed a service-role tool, and that is one
-- way. It is the wrong way here: it means the only path to reading a report
-- runs through a key that must never reach a browser, which in practice
-- means nobody reads them, which is where we started. So moderators are a
-- role in the database instead, and the queue is a screen in the app they
-- already have.
--
-- Being a moderator is deliberately not self-service and not a column on
-- users: it is a row in a table only a database admin can write, so it
-- cannot be granted by anything the app does. Compare account_type in
-- 20260912000000, frozen for the same reason.
--
-- WHAT A MODERATOR CAN DO
--   read every report, and the content it points at
--   hide a piece of content from everyone but its owner
--   mark a report actioned or dismissed
--
-- WHAT A MODERATOR CANNOT DO
--   delete a child's work. Hiding is reversible and keeps the evidence;
--   deletion would destroy the thing a parent or school might need to see.
--   read private entries. Hiding only reaches what was published — a report
--   can only ever have been filed against something the reporter could see.

-- ============================================================ moderators
create table if not exists public.moderators (
  user_id    uuid primary key references public.users (id) on delete cascade,
  added_at   timestamptz not null default now(),
  note       text
);

alter table public.moderators enable row level security;
-- No policies: nothing reachable from the API reads or writes this. The
-- helper below is security definer and sees it regardless.
revoke all on public.moderators from anon, authenticated;

-- Security definer so calling it from inside a policy does not re-enter that
-- policy — the same recursion trap 20260824000001 had to fix on users.
create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.moderators m where m.user_id = auth.uid());
$$;

revoke all on function public.is_moderator() from public, anon;
grant execute on function public.is_moderator() to authenticated;

-- ======================================================= hiding content
-- Reversible, and never destructive. A hidden row stays readable by the
-- person who wrote it, so a child is not silently robbed of their own work.
alter table public.entries   add column if not exists hidden_at timestamptz;
alter table public.photos    add column if not exists hidden_at timestamptz;
alter table public.interests add column if not exists hidden_at timestamptz;

create or replace function public.moderate_hide(
  p_target_type text,
  p_target_id   text,
  p_hidden      boolean default true
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_when timestamptz := case when p_hidden then now() else null end;
begin
  if not public.is_moderator() then
    raise exception 'not a moderator' using errcode = '42501';
  end if;

  if p_target_type = 'entry' then
    update public.entries set hidden_at = v_when where id = p_target_id;
  elsif p_target_type = 'photo' then
    update public.photos set hidden_at = v_when where id = p_target_id;
  elsif p_target_type = 'interest' then
    update public.interests set hidden_at = v_when where id = p_target_id;
  else
    raise exception 'cannot hide a %', p_target_type using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.moderate_hide(text, text, boolean) from public, anon;
grant execute on function public.moderate_hide(text, text, boolean) to authenticated;

-- ================================================ the queue, and closing it
create or replace function public.moderation_queue()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows jsonb;
begin
  if not public.is_moderator() then
    raise exception 'not a moderator' using errcode = '42501';
  end if;

  -- The reported content travels with the report. A moderator who has to go
  -- and find the thing by hand will not do it, and the whole point is that
  -- acting on a report has to be quicker than ignoring it.
  select coalesce(jsonb_agg(row_to_json(r)::jsonb order by r.created_at), '[]'::jsonb)
  into v_rows
  from (
    select
      rep.id, rep.target_type, rep.target_id, rep.reason, rep.status, rep.created_at,
      reporter.display_name as reporter_name,
      case rep.target_type
        when 'entry'    then (select e.text    from public.entries e   where e.id = rep.target_id)
        when 'photo'    then (select p.caption from public.photos p    where p.id = rep.target_id)
        when 'interest' then (select i.name    from public.interests i where i.id = rep.target_id)
        when 'user'     then (select u.display_name from public.users u where u.id::text = rep.target_id)
      end as content,
      case rep.target_type
        when 'entry'    then (select e.hidden_at is not null from public.entries e   where e.id = rep.target_id)
        when 'photo'    then (select p.hidden_at is not null from public.photos p    where p.id = rep.target_id)
        when 'interest' then (select i.hidden_at is not null from public.interests i where i.id = rep.target_id)
        else false
      end as is_hidden
    from public.reports rep
    left join public.users reporter on reporter.id = rep.reporter_id
    where rep.status = 'open'
    order by rep.created_at
    limit 200
  ) r;

  return v_rows;
end;
$$;

revoke all on function public.moderation_queue() from public, anon;
grant execute on function public.moderation_queue() to authenticated;

create or replace function public.moderate_resolve(p_report_id text, p_status text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_moderator() then
    raise exception 'not a moderator' using errcode = '42501';
  end if;
  if p_status not in ('actioned', 'dismissed') then
    raise exception 'a report is either actioned or dismissed' using errcode = '22023';
  end if;
  update public.reports set status = p_status where id = p_report_id;
end;
$$;

revoke all on function public.moderate_resolve(text, text) from public, anon;
grant execute on function public.moderate_resolve(text, text) to authenticated;

-- Tells the app whether to show the queue at all.
create or replace function public.am_i_moderator()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_moderator();
$$;

revoke all on function public.am_i_moderator() from public, anon;
grant execute on function public.am_i_moderator() to authenticated;

notify pgrst, 'reload schema';

-- ====================================== hidden content leaves circulation
-- Hiding is only real if the read policies honour it, so the three
-- visibility policies gain a hidden_at check beside the deleted_at one they
-- already carry. Owners are unaffected in every case: a child can still see
-- their own hidden work, which is the difference between moderation and
-- confiscation.
--
-- ON THE ORDER THESE MIGRATIONS ARE APPLIED IN
-- 20260918000000 adds viewer_is_disclosure_locked() and puts it in these
-- same policies, and it is deliberately not applied yet — it is waiting on
-- the consent email worker. This file is numbered after it, so on a fresh
-- project 20260918 runs first and this rewrite must keep its clause or the
-- disclosure lock would be silently removed by a later migration.
--
-- So: define a stub that returns false only if the real one is absent. On a
-- fresh project the real one already exists and this does nothing. On this
-- project, where only this migration is applied, the stub makes the clause
-- a no-op — and when 20260918 is finally applied, its `create or replace`
-- swaps the stub for the real function and these policies start enforcing
-- it with no further change.
do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'viewer_is_disclosure_locked'
  ) then
    execute $fn$
      create function public.viewer_is_disclosure_locked()
      returns boolean language sql stable
      set search_path = public, pg_temp
      as 'select false';
    $fn$;
  end if;
end
$$;

alter policy "interests_select" on public.interests
  using (
    user_id = auth.uid()
    or (
      not public.viewer_is_disclosure_locked()
      and interests.deleted_at is null
      and interests.hidden_at is null
      and (
        exists (select 1 from public.users u where u.id = interests.user_id and u.discovery_enabled = true)
        or exists (
          select 1 from public.users u
          where u.id = interests.user_id and u.class_code is not null and u.class_code = public.my_class_code()
        )
      )
      and not exists (
        select 1 from public.blocks b
        where (b.user_id = auth.uid() and b.blocked_user_id = interests.user_id)
           or (b.user_id = interests.user_id and b.blocked_user_id = auth.uid())
      )
    )
  );

alter policy "entries_select" on public.entries
  using (
    exists (
      select 1 from public.interests i
      join public.users u on u.id = i.user_id
      where i.id = entries.interest_id
        and (
          i.user_id = auth.uid()
          or (
            not public.viewer_is_disclosure_locked()
            and entries.deleted_at is null
            and entries.hidden_at is null
            and i.hidden_at is null
            and entries.visibility = 'public'
            and (
              u.discovery_enabled = true
              or (u.class_code is not null and u.class_code = public.my_class_code())
            )
          )
        )
    )
  );

alter policy "photos_select" on public.photos
  using (
    exists (
      select 1 from public.interests i
      join public.users u on u.id = i.user_id
      where i.id = photos.interest_id
        and (
          i.user_id = auth.uid()
          or (
            not public.viewer_is_disclosure_locked()
            and photos.deleted_at is null
            and photos.hidden_at is null
            and i.hidden_at is null
            and photos.visibility = 'public'
            and (
              u.discovery_enabled = true
              or (u.class_code is not null and u.class_code = public.my_class_code())
            )
          )
        )
    )
  );

notify pgrst, 'reload schema';
