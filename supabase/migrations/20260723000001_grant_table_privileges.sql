-- "Automatically expose new tables" was deliberately off when this project
-- was created (so nothing became reachable by accident) — but that setting
-- also controls whether Postgres grants the `authenticated` role base
-- table-level privileges. RLS policies decide which *rows* are visible;
-- these grants decide whether the role can reach the table at all. Without
-- them every query fails with "permission denied for table X", even for a
-- row's own owner, regardless of how correct the RLS policy is.
--
-- Only `authenticated` is granted anything — there is no anonymous/logged-
-- out read path in this app's design, so `anon` gets nothing.

grant usage on schema public to authenticated;

grant select, insert, update on public.users to authenticated;
grant select, insert, delete on public.blocks to authenticated;
grant select, insert, update, delete on public.interests to authenticated;
grant select, insert, update, delete on public.photos to authenticated;
grant select, insert, update, delete on public.entries to authenticated;
grant select, insert, delete on public.watches to authenticated;
grant select, insert on public.reports to authenticated;
