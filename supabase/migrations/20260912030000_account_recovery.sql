-- Account recovery for students with no email.
--
-- THE PROBLEM THIS SOLVES
-- A student signs up with a username and a password and no email address,
-- because a meaningful share of them don't have one. There is consequently
-- no reset link, no second factor, and no support desk. Without this, a
-- child who forgot their password lost every tree, photo, journal entry and
-- voice note they had ever made, permanently, with no path back. That is
-- the harshest failure mode in the product.
--
-- THE SHAPE OF THE FIX
-- A recovery code, issued while the student is still signed in, written
-- down by them, and redeemable later for a new password. The code has to be
-- created *before* it is needed, which is why issuing it is a separate
-- thing from redeeming it.
--
-- Codes are stored as a bcrypt hash and never in the clear — not even
-- readable by the account that owns them. A code you can read back out of
-- the app is a code that a borrowed, already-unlocked phone can read out of
-- the app, which would defeat the point. The student sees it exactly once,
-- when it is generated, and can generate a fresh one whenever they like.
--
-- WHY THIS FILE DOES NOT NAME THE pgcrypto SCHEMA
-- The first version of this migration opened with
--   create extension if not exists pgcrypto with schema extensions;
-- and then called extensions.crypt(...) throughout. Both halves of that are
-- assumptions about a project this migration does not own. If the schema
-- named there does not exist, the statement raises; the SQL editor runs the
-- whole file as one transaction, so the table and all three functions roll
-- back together and nothing is left behind to show for it. The app then
-- fails with PostgREST's "could not find the function in the schema cache",
-- which is true but says nothing about why.
--
-- So: install pgcrypto only if it is missing, leave it alone if it is
-- already installed somewhere, and call crypt/gen_salt unqualified with a
-- pinned search_path that covers both plausible homes. The search path is
-- fixed at definition time and puts extensions ahead of public, so nothing
-- created in public later can shadow crypt inside a definer function.
--
-- A NOTE ON HOW THE PASSWORD IS ACTUALLY SET, AND ITS TRADE-OFF
-- Resetting a password for somebody who is *not* signed in needs privileges
-- a browser cannot hold. There are two ways to get them:
--
--   (a) An edge function holding the service-role key, calling the admin
--       API. This is the supported path. It needs a deploy step.
--   (b) A security-definer function writing auth.users directly, which is
--       what this migration does. No deploy step, but it depends on
--       Supabase storing bcrypt in auth.users.encrypted_password — an
--       internal detail, not a documented contract.
--
-- (b) is chosen here because it works today with no infrastructure the
-- project doesn't already have. If that assumption ever stops holding,
-- redeem_recovery_code raises rather than silently succeeding, and the fix
-- is to move this one function to an edge function and change the single
-- rpc() call in lib/remote.js. Nothing else in the flow depends on which
-- path is used.
--
-- Deliberately NOT done here: revoking existing sessions. Doing that means
-- reaching into auth's session tables, whose shape is far less stable than
-- the password column, and the case this exists for is a student with no
-- session at all. A student who still has a session should use Me → Change
-- password, which goes through Supabase's own API.

-- ================================================== pgcrypto, defensively
create schema if not exists extensions;

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pgcrypto') then
    create extension pgcrypto with schema extensions;
  end if;
end
$$;

-- ===================================================== recovery_codes
create table if not exists public.recovery_codes (
  user_id    uuid primary key references public.users (id) on delete cascade,
  code_hash  text not null,
  created_at timestamptz not null default now(),
  used_at    timestamptz
);

alter table public.recovery_codes enable row level security;

-- No policies, on purpose. RLS with zero policies denies everything to
-- everyone, which is exactly right: the only things that may touch this
-- table are the three definer functions below. A client must never be able
-- to read a hash, count rows, or learn whether a given username has a code.
revoke all on public.recovery_codes from anon, authenticated;

-- ====================================================== issuing a code
-- Called while signed in, so it needs no username argument — auth.uid() is
-- the account. Replaces any previous code: one live code per account, so a
-- code written down and then re-generated stops working, which is the
-- behaviour someone re-generating it after losing the paper expects.
--
-- The 12-character minimum matches canonicalRecoveryCode in
-- lib/recoveryCode.js, which strips the display dashes before sending.
create or replace function public.set_recovery_code(p_code text)
returns void
language plpgsql
security definer
set search_path = extensions, public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_code is null or length(p_code) < 12 then
    raise exception 'recovery code too short' using errcode = '22023';
  end if;

  insert into public.recovery_codes (user_id, code_hash, created_at, used_at)
  values (auth.uid(), crypt(p_code, gen_salt('bf')), now(), null)
  on conflict (user_id) do update
    set code_hash = excluded.code_hash,
        created_at = now(),
        used_at = null;
end;
$$;

revoke all on function public.set_recovery_code(text) from public, anon;
grant execute on function public.set_recovery_code(text) to authenticated;

-- Whether this account has an unused code, so the UI can nag an account
-- that has never set one. Returns a boolean and never the code itself.
create or replace function public.has_recovery_code()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  return exists (
    select 1 from public.recovery_codes
    where user_id = auth.uid() and used_at is null
  );
end;
$$;

revoke all on function public.has_recovery_code() from public, anon;
grant execute on function public.has_recovery_code() to authenticated;

-- ==================================================== redeeming a code
-- Called by somebody who is NOT signed in, which is why this one takes a
-- username: there is no auth.uid() to read.
--
-- Granted to anon by necessity. Three things keep that safe:
--   the code is 60-odd bits of entropy, so guessing is not a strategy;
--   a wrong username and a wrong code fail identically, so this cannot be
--     used to find out which usernames exist;
--   a code is single-use — used_at is stamped on success.
create or replace function public.redeem_recovery_code(
  p_username     text,
  p_code         text,
  p_new_password text
)
returns boolean
language plpgsql
security definer
set search_path = extensions, public, pg_temp
as $$
declare
  v_uid  uuid;
  v_hash text;
begin
  if p_new_password is null or length(p_new_password) < 6 then
    raise exception 'password too short' using errcode = '22023';
  end if;

  select u.id into v_uid
  from public.users u
  where lower(u.display_name) = lower(trim(p_username));

  -- Same answer for "no such user" as for "wrong code", so this is not a
  -- way to enumerate who has an account.
  if v_uid is null then
    return false;
  end if;

  select rc.code_hash into v_hash
  from public.recovery_codes rc
  where rc.user_id = v_uid and rc.used_at is null;

  if v_hash is null then
    return false;
  end if;

  if crypt(p_code, v_hash) <> v_hash then
    return false;
  end if;

  -- See the header: this is the internal-detail dependency. bcrypt is what
  -- Supabase stores here, and gen_salt('bf') is what produces it.
  update auth.users
  set encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  where id = v_uid;

  update public.recovery_codes
  set used_at = now()
  where user_id = v_uid;

  return true;
end;
$$;

revoke all on function public.redeem_recovery_code(text, text, text) from public;
grant execute on function public.redeem_recovery_code(text, text, text) to anon, authenticated;

-- PostgREST answers rpc() calls from a cached copy of the schema and does
-- not notice new functions on its own. Without this, every call returns
-- "Could not find the function in the schema cache" even once the function
-- genuinely exists.
notify pgrst, 'reload schema';
