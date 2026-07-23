-- Multi-user schema: users, ownership, visibility, discovery.
--
-- IDs on interests/photos/entries/watches/reports stay `text`, not `uuid`,
-- because the client (src/lib/id.js) generates them offline before syncing
-- ("o" + timestamp + random) — a local-first write must not depend on the
-- server to mint an id. users.id is a real uuid because it's always
-- auth.uid(), which only ever exists once a session is authenticated.

-- ============================================================== users
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar text not null default '',
  bio text not null default '',
  account_type text not null default 'individual' check (account_type in ('individual', 'org')),
  discovery_enabled boolean not null default false,
  default_visibility text not null default 'private' check (default_visibility in ('private', 'public')),
  created_at timestamptz not null default now()
);

-- Case-insensitive search over display names, scoped to discoverable users
-- at query time (see users_select below) so the index itself carries no
-- privacy meaning on its own.
create index users_display_name_search_idx on public.users (lower(display_name) text_pattern_ops);

alter table public.users enable row level security;

create policy "users_insert_self" on public.users
  for insert with check (auth.uid() = id);

create policy "users_update_self" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ================================================================ blocks
-- Declared before interests/the users select policy so both can reference
-- it. `(A, B)` means A blocked B; every place that checks visibility
-- between two users checks the pair in both directions, since a block is
-- meant to be mutual disengagement, not a one-way mute (see PRD §7/§9).
create table public.blocks (
  user_id uuid not null references public.users (id) on delete cascade,
  blocked_user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_user_id),
  check (user_id <> blocked_user_id)
);

alter table public.blocks enable row level security;

create policy "blocks_select_own" on public.blocks
  for select using (user_id = auth.uid());

create policy "blocks_insert_own" on public.blocks
  for insert with check (user_id = auth.uid());

create policy "blocks_delete_own" on public.blocks
  for delete using (user_id = auth.uid());

-- Anyone signed in can always read their own row regardless of
-- discovery_enabled; everyone else is visible only when they've opted into
-- being found AND neither side has blocked the other.
create policy "users_select" on public.users
  for select using (
    auth.uid() = id
    or (
      discovery_enabled = true
      and not exists (
        select 1 from public.blocks b
        where (b.user_id = auth.uid() and b.blocked_user_id = users.id)
           or (b.user_id = users.id and b.blocked_user_id = auth.uid())
      )
    )
  );

-- Auto-create the public profile row the moment someone signs up, so the
-- client never has to remember a separate "create my profile" step.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================= interests
create table public.interests (
  id text primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  why text not null default '',
  color text not null default '',
  time text,
  friends text[] not null default '{}',
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  category text,
  inspired_by text references public.interests (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index interests_user_id_idx on public.interests (user_id);
create index interests_public_idx on public.interests (visibility) where visibility = 'public';

alter table public.interests enable row level security;

create policy "interests_insert_own" on public.interests
  for insert with check (user_id = auth.uid());

create policy "interests_update_own" on public.interests
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "interests_delete_own" on public.interests
  for delete using (user_id = auth.uid());

-- Same block check as users_select. This is the only place that needs it:
-- photos_select/entries_select below both subquery this table to check
-- their parent orb, and that subquery is itself subject to this policy —
-- so blocking someone hides their photos and journal entries too, for free.
create policy "interests_select" on public.interests
  for select using (
    user_id = auth.uid()
    or (
      visibility = 'public'
      and not exists (
        select 1 from public.blocks b
        where (b.user_id = auth.uid() and b.blocked_user_id = interests.user_id)
           or (b.user_id = interests.user_id and b.blocked_user_id = auth.uid())
      )
    )
  );

-- ================================================================ photos
-- `storage_path` replaces the local Blob (src/components/sheets/PhotoSheet.jsx)
-- once uploads move to Supabase Storage; wiring that up is a follow-up step.
create table public.photos (
  id text primary key,
  interest_id text not null references public.interests (id) on delete cascade,
  storage_path text,
  caption text not null default '',
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  is_pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index photos_interest_id_idx on public.photos (interest_id);

alter table public.photos enable row level security;

-- A photo is visible to someone else only when it AND its parent orb are
-- both public — matches the existing per-item visibility toggle while still
-- respecting the orb-level gate, so flipping an orb back to private hides
-- every photo inside it immediately, with no per-row update needed.
create policy "photos_select" on public.photos
  for select using (
    exists (
      select 1 from public.interests i
      where i.id = photos.interest_id
        and (i.user_id = auth.uid() or (i.visibility = 'public' and photos.visibility = 'public'))
    )
  );

create policy "photos_insert_own" on public.photos
  for insert with check (
    exists (select 1 from public.interests i where i.id = interest_id and i.user_id = auth.uid())
  );

create policy "photos_update_own" on public.photos
  for update using (
    exists (select 1 from public.interests i where i.id = interest_id and i.user_id = auth.uid())
  );

create policy "photos_delete_own" on public.photos
  for delete using (
    exists (select 1 from public.interests i where i.id = interest_id and i.user_id = auth.uid())
  );

-- =============================================================== entries
create table public.entries (
  id text primary key,
  interest_id text not null references public.interests (id) on delete cascade,
  date text not null,
  text text not null default '',
  minutes integer not null default 30,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index entries_interest_id_idx on public.entries (interest_id);

alter table public.entries enable row level security;

-- Same double-gate as photos: a journal entry needs its own visibility flag
-- AND a public parent orb before a stranger can read it (PRD §7: journal
-- entries are private by default even inside a public orb).
create policy "entries_select" on public.entries
  for select using (
    exists (
      select 1 from public.interests i
      where i.id = entries.interest_id
        and (i.user_id = auth.uid() or (i.visibility = 'public' and entries.visibility = 'public'))
    )
  );

create policy "entries_insert_own" on public.entries
  for insert with check (
    exists (select 1 from public.interests i where i.id = interest_id and i.user_id = auth.uid())
  );

create policy "entries_update_own" on public.entries
  for update using (
    exists (select 1 from public.interests i where i.id = interest_id and i.user_id = auth.uid())
  );

create policy "entries_delete_own" on public.entries
  for delete using (
    exists (select 1 from public.interests i where i.id = interest_id and i.user_id = auth.uid())
  );

-- =============================================================== watches
-- "Keeping an eye on" an interest. Deliberately points at an interest, never
-- at a user — there is no `follows` table (PRD §7).
create table public.watches (
  id text primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  interest_id text not null references public.interests (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, interest_id)
);

create index watches_user_id_idx on public.watches (user_id);
create index watches_interest_id_idx on public.watches (interest_id);

alter table public.watches enable row level security;

create policy "watches_select_own" on public.watches
  for select using (user_id = auth.uid());

create policy "watches_insert_own" on public.watches
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.interests i where i.id = interest_id and i.visibility = 'public')
  );

create policy "watches_delete_own" on public.watches
  for delete using (user_id = auth.uid());

-- =============================================================== reports
create table public.reports (
  id text primary key,
  reporter_id uuid not null references public.users (id) on delete cascade,
  target_type text not null check (target_type in ('interest', 'photo', 'entry', 'user')),
  target_id text not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now()
);

create index reports_status_idx on public.reports (status);

alter table public.reports enable row level security;

-- Reporters can file and read their own reports. No update/delete policy
-- for anyone: only a service-role-backed moderation tool should change
-- report status, which bypasses RLS entirely rather than needing a policy.
create policy "reports_select_own" on public.reports
  for select using (reporter_id = auth.uid());

create policy "reports_insert_own" on public.reports
  for insert with check (reporter_id = auth.uid());
