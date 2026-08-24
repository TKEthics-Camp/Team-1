-- Real per-educator class codes, replacing the two hardcoded values every
-- account shared before (CLASS_CODES in constants.js). Two pieces:
--
--   classes       one row per educator: the code they were issued, and
--                 who owns it. Exists only so a typed code can be checked
--                 for existence *before* the checking account has joined
--                 anything — see the classes_select policy below for why
--                 that can't go through users_select instead.
--
--   users.class_code   which class *this* account (educator or joined
--                       student) currently belongs to. This is what
--                       actually powers classmate visibility once someone
--                       has joined — see the users_select change below.

-- ============================================================== classes
create table public.classes (
  code text primary key,
  owner_id uuid not null unique references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.classes enable row level security;

-- A code exists to be handed out and typed in by students, so there's
-- nothing sensitive in a row beyond the owner's uuid — and users_select
-- still keeps that uuid from resolving to a full profile unless the
-- educator is separately discoverable. Any signed-in user can read the
-- table, the same way a code works in the real world: whoever has it can
-- use it. (This is also the only way to validate a code pre-join: a
-- student hasn't joined yet, so the users_select class-code branch below
-- can't see the educator's row for them yet.)
create policy "classes_select" on public.classes
  for select using (true);

create policy "classes_insert_own" on public.classes
  for insert with check (owner_id = auth.uid());

grant select, insert on public.classes to authenticated;

-- ========================================================= users.class_code
alter table public.users
  add column if not exists class_code text;

-- Classmates can see each other once they share a class_code, the same
-- way discovery_enabled already lets two unrelated users see each other —
-- joining a class is the opt-in here, same as flipping discovery on is
-- there. Still respects blocks either direction, same check as the
-- existing discovery branch.
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
      and class_code = (select u2.class_code from public.users u2 where u2.id = auth.uid())
      and not exists (
        select 1 from public.blocks b
        where (b.user_id = auth.uid() and b.blocked_user_id = users.id)
           or (b.user_id = users.id and b.blocked_user_id = auth.uid())
      )
    )
  );
