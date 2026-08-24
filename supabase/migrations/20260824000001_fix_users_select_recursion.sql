-- Fixes "infinite recursion detected in policy for relation users",
-- introduced by 20260824000000_classes.sql. That migration's class-code
-- branch on users_select subqueried public.users from inside a policy
-- defined on public.users — Postgres re-applies the same policy to that
-- subquery, which contains the same subquery again, and so on, and
-- detects the cycle instead of looping forever. Since every read against
-- users goes through users_select, this broke far more than the class
-- feature: any select on users (including the one right after signup)
-- started failing outright.
--
-- Fix: do the "what's my own class_code" lookup through a security
-- definer function instead of a raw subquery. A security definer function
-- runs with the privileges of its owner and bypasses RLS on the tables it
-- touches, so calling it from inside a policy doesn't re-trigger that same
-- policy — same reasoning as handle_new_user's security definer, just
-- applied to a lookup instead of an insert.
create or replace function public.my_class_code()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select class_code from public.users where id = auth.uid();
$$;

alter policy "users_select" on public.users
  using (
    auth.uid() = id
    or (
      discovery_enabled = true
      and not exists (
        select 1 from public.blocks b
        where (b.user_id = auth.uid() and b.blocked_user_id = users.id)
           or (b.user_id = users.id and b.blocked_user_id = auth.uid())
      )
    )
    or (
      class_code is not null
      and class_code = public.my_class_code()
      and not exists (
        select 1 from public.blocks b
        where (b.user_id = auth.uid() and b.blocked_user_id = users.id)
           or (b.user_id = users.id and b.blocked_user_id = auth.uid())
      )
    )
  );
