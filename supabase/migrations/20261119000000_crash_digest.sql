-- Crash reports, where someone will see them.
--
-- THE GAP
-- 20261114000000 started keeping crash reports, but the only way to read
-- them was to open the table in the Supabase dashboard — which nobody does
-- unless they already suspect something. A crash that only happens on one
-- kind of phone could sit there for weeks.
--
-- THE FIX
-- crash_digest() hands moderators — the people who already open the app's
-- Reports screen — the last 14 days of crashes, grouped by what went wrong
-- and where, so the Reports screen can show them and the Me tab can say
-- when there are any. It answers only for someone in public.moderators, and
-- it never says who crashed: each group carries how many times and on how
-- many accounts, not which ones.

create or replace function public.crash_digest()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_moderator() then
    raise exception 'not a moderator' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(g order by g.last_at desc)
    from (
      select
        c.message,
        c."where",
        count(*)::int                         as times,
        (count(*) filter (where c.at > now() - interval '7 days'))::int as this_week,
        count(distinct c.user_id)::int        as accounts,
        max(c.at)                             as last_at,
        min(c.at)                             as first_at,
        (array_agg(c.version  order by c.at desc, c.id desc))[1] as version,
        (array_agg(c.stack    order by c.at desc, c.id desc))[1] as stack,
        array_agg(distinct c.platform) filter (where c.platform is not null) as platforms
      from public.crash_reports c
      where c.at > now() - interval '14 days'
      group by c.message, c."where"
    ) g
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.crash_digest() from public, anon;
grant execute on function public.crash_digest() to authenticated;

notify pgrst, 'reload schema';
