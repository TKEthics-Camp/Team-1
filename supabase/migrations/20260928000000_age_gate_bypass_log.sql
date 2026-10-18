-- ================================================== age gate bypass log
-- apply_age_gate() is a security-relevant RPC: it decides whether a new
-- account is old enough to sign up freely or needs guardian consent. If
-- this migration (or an earlier one it depends on) hasn't been deployed
-- to a project yet, the RPC call from the client returns PGRST202 ("could
-- not find the function") and the client lets signup proceed ungated
-- rather than blocking every new account over a missing migration.
--
-- That's the right call operationally, but until now it was silent: a
-- console.warn nobody watches. This table gives whoever is responsible
-- for the app a durable, queryable record of every account that signed
-- up while the gate was absent, so "the gate wasn't deployed" is a fact
-- someone can act on instead of a fact nobody knows.

create table if not exists public.age_gate_bypass_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.age_gate_bypass_log enable row level security;

-- The client logs its own bypass event as part of the signup it just
-- completed — no way to log one for anyone else, since user_id has to
-- match the caller.
drop policy if exists "age_gate_bypass_log_insert_own" on public.age_gate_bypass_log;
create policy "age_gate_bypass_log_insert_own" on public.age_gate_bypass_log
  for insert
  with check (user_id = auth.uid());

-- Only moderators can read the log back — it's an operational signal for
-- whoever is watching the moderation queue, not something every user's
-- client should be able to enumerate.
drop policy if exists "age_gate_bypass_log_select_moderator" on public.age_gate_bypass_log;
create policy "age_gate_bypass_log_select_moderator" on public.age_gate_bypass_log
  for select
  using (public.is_moderator());

revoke all on public.age_gate_bypass_log from anon;
grant select, insert on public.age_gate_bypass_log to authenticated;
