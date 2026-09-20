-- Brings back watches ("keep an eye on this hobby").
--
-- It was dropped in 20260908010000 for a good reason: it had been sitting in
-- the schema since the first migration with nothing on the client ever
-- referencing it, and its insert policy was what blocked dropping
-- interests.visibility alongside it. Dropping a dead table rather than
-- CASCADE-ing past it was the right call at the time. This recreates it
-- because it now has a feature behind it — the watch button on
-- PublicInterestScreen and the list in the Me tab.
--
-- Two things are deliberately different from the original.
--
-- First, it still points at an interest and never at a user. There is no
-- follows table (PRD §7), and that is a product decision, not an oversight:
-- "keep an eye on this hobby" and "follow this child" are different social
-- contracts, and the schema is what stops the second being built by
-- accident.
--
-- Second, the old insert policy required interests.visibility = 'public'.
-- That column no longer exists — visibility became account-level in
-- 20260825000000 (the owner is discoverable, or shares your class code).
-- So the check is now just "the interest exists", which is enough: RLS
-- applies to tables referenced inside a policy, so that EXISTS is itself
-- filtered by interests_select. You can only watch a hobby you can already
-- see, and that stays true as the visibility rules change, without this
-- policy needing to know what they are.

create table if not exists public.watches (
  id text primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  interest_id text not null references public.interests (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, interest_id)
);

create index if not exists watches_user_id_idx on public.watches (user_id);
create index if not exists watches_interest_id_idx on public.watches (interest_id);

alter table public.watches enable row level security;

drop policy if exists "watches_select_own" on public.watches;
create policy "watches_select_own" on public.watches
  for select using (user_id = auth.uid());

drop policy if exists "watches_insert_own" on public.watches;
create policy "watches_insert_own" on public.watches
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.interests i where i.id = interest_id)
  );

drop policy if exists "watches_delete_own" on public.watches;
create policy "watches_delete_own" on public.watches
  for delete using (user_id = auth.uid());

grant select, insert, delete on public.watches to authenticated;
