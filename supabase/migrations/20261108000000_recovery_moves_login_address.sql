-- A recovery code also brings a student's login address up to date.
--
-- THE GAP
-- A student signs in with an address derived from their username
-- (src/lib/syntheticEmail.js). Renaming used to change only the name, so
-- anyone who renamed before 2026-11-07 still has an address made from the
-- old one. The app moves it the next time they sign in — but only once they
-- are in. A student in that position who has also forgotten their password
-- redeems their code under their current name (the only name the server
-- knows them by), gets a new password, and still cannot sign in: the new
-- name derives an address the account doesn't have, and they no longer know
-- the old name that would.
--
-- THE FIX
-- redeem_recovery_code takes the address the app is about to sign in with.
-- Once the code has checked out — so this is the account's owner — the
-- account is moved to that address, if and only if:
--   * its current address is one of the derived ones (a student's), so an
--     educator's real email is never touched;
--   * the new one is a well-formed derived address too;
--   * no other account has it.
-- Otherwise the reset goes ahead exactly as before and the address stays.
--
-- The new argument is optional and the function keeps its name, answer and
-- every behaviour it had, so app versions that don't send it are unaffected,
-- and the app falls back to the old call against a database without this.
-- The old three-argument version is dropped rather than kept beside it: two
-- versions would both match a three-argument call and Postgres would refuse
-- to choose.
--
-- Checked by tests/recovery_checks.sql (paste into the SQL editor; it leaves
-- nothing behind).

drop function if exists public.redeem_recovery_code(text, text, text);

create or replace function public.redeem_recovery_code(
  p_username     text,
  p_code         text,
  p_new_password text,
  p_login_email  text default null
)
returns boolean
language plpgsql
security definer
set search_path = extensions, public, pg_temp
as $$
declare
  v_uid     uuid;
  v_rec     public.recovery_codes%rowtype;
  v_current text;
  v_target  text := lower(trim(coalesce(p_login_email, '')));
  v_domain  constant text := '@users.forestapp.invalid';
begin
  if p_new_password is null or length(p_new_password) < 6 then
    raise exception 'password too short' using errcode = '22023';
  end if;

  select u.id into v_uid
  from public.users u
  where lower(u.display_name) = lower(trim(p_username));

  -- Every failure below returns false and nothing else, so none of them can
  -- be told apart from outside: no such user, no code, locked out, wrong
  -- code. That is what stops this being a username oracle.
  if v_uid is null then
    return false;
  end if;

  select * into v_rec
  from public.recovery_codes
  where user_id = v_uid and used_at is null;

  if not found then
    return false;
  end if;

  if v_rec.locked_until is not null and v_rec.locked_until > now() then
    return false;
  end if;

  if crypt(p_code, v_rec.code_hash) <> v_rec.code_hash then
    -- Both right-hand sides read the pre-update value, so they agree on
    -- what attempt this is. Counting restarts with the lock, so the next
    -- five wrong guesses buy another fifteen minutes rather than one
    -- attempt each.
    update public.recovery_codes
    set failed_attempts = case
          when failed_attempts + 1 >= 5 then 0
          else failed_attempts + 1
        end,
        locked_until = case
          when failed_attempts + 1 >= 5 then now() + interval '15 minutes'
          else locked_until
        end
    where user_id = v_uid;
    return false;
  end if;

  update auth.users
  set encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  where id = v_uid;

  update public.recovery_codes
  set used_at = now(),
      failed_attempts = 0,
      locked_until = null
  where user_id = v_uid;

  -- The address, last, and only when every condition holds. Not meeting
  -- one is not an error: the password has been reset either way, and the
  -- answer stays the same so it says nothing about the account.
  select lower(email) into v_current from auth.users where id = v_uid;
  if v_target <> ''
     and v_target <> v_current
     and right(v_current, length(v_domain)) = v_domain
     and right(v_target, length(v_domain)) = v_domain
     and length(v_target) <= 254
     and left(v_target, length(v_target) - length(v_domain)) ~ '^[a-z0-9._-]{1,64}$'
     and not exists (
       select 1 from auth.users other
       where lower(other.email) = v_target and other.id <> v_uid
     )
  then
    update auth.users
    set email = v_target,
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
          || jsonb_build_object('username', (select display_name from public.users where id = v_uid)),
        updated_at = now()
    where id = v_uid;

    -- Supabase keeps the address on the sign-in identity as well; the two
    -- should agree, as they do after an email change made through Auth.
    update auth.identities
    set identity_data = coalesce(identity_data, '{}'::jsonb) || jsonb_build_object('email', v_target),
        updated_at = now()
    where user_id = v_uid and provider = 'email';
  end if;

  return true;
end;
$$;

revoke all on function public.redeem_recovery_code(text, text, text, text) from public;
grant execute on function public.redeem_recovery_code(text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
