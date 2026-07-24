-- Educator-created classes. An "org" account (see users.account_type)
-- creates one during onboarding and gets a code back to hand out; students
-- join it later with that code (JoinClassSheet). `id` IS the code itself —
-- short, human-typeable, unique — rather than a separate uuid+code pair,
-- matching how interests/photos/entries already use their own natural id
-- as primary key. There is deliberately no class_members table yet: joining
-- only sets a student's own profile.classCode locally/in `users` is not
-- tracked here at all, so this table exists purely to make a code
-- verifiable ("does this code exist, and is it real") — the classmate
-- roster shown in the School tab is still the existing fabricated demo data
-- (see src/lib/constants.js STUDENTS), not a real per-class query, and
-- wiring that up for real is a separate follow-up.

create table public.classes (
  id text primary key,
  owner_id uuid not null references public.users (id) on delete cascade,
  name text not null default '',
  created_at timestamptz not null default now()
);

create index classes_owner_id_idx on public.classes (owner_id);

alter table public.classes enable row level security;

-- The code is the shareable secret, not the row itself — once someone has
-- a code to check, confirming it's real (and whose) isn't sensitive, so a
-- broad select is fine here.
create policy "classes_select_all" on public.classes
  for select using (true);

create policy "classes_insert_own" on public.classes
  for insert with check (owner_id = auth.uid());

create policy "classes_delete_own" on public.classes
  for delete using (owner_id = auth.uid());

-- Same reasoning as 20260723000001_grant_table_privileges.sql: RLS decides
-- which rows are visible, this grant decides whether `authenticated` can
-- reach the table at all.
grant select, insert, delete on public.classes to authenticated;
