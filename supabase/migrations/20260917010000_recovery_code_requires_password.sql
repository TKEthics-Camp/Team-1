-- Closes a hole opened by the recovery feature itself, and puts a limit on
-- guessing at the anonymous end of it.
--
-- THE HOLE
-- Changing your password from Me asks for the current one first. Generating
-- a recovery code did not. So the recovery sheet was a way around the check
-- the password sheet enforces: anyone holding an unlocked phone for a few
-- seconds could tap Me -> Recovery code -> Make a new one, photograph the
-- code, hand the phone back, and take the account over at their leisure.
--
-- In a classroom of borrowed and shared devices that is the realistic
-- attack, and it is worse than a stolen password because nothing visible
-- changes. The student keeps signing in normally and has no way to know.
--
-- So set_recovery_code now takes the account's current password and checks
-- it, exactly as changing the password does. The one-argument version is
-- DROPPED rather than left in place — leaving it would leave the bypass,
-- since it is the grant to authenticated that made it reachable.
--
-- This costs a student who is signed in but has forgotten their password
-- the ability to create a code. That is not a regression: they cannot
-- change their password in that state either, and a recovery code is
-- explicitly the thing you create while you still know your password.
--
-- THE GUESSING LIMIT
-- redeem_recovery_code is granted to anon by necessity — the student
-- calling it cannot sign in, that is the point. A 56-bit code is not
-- brute-forceable, but an unauthenticated endpoint that sets passwords and
-- accepts unlimited attempts should not exist regardless of the arithmetic.
-- Five wrong codes locks that account's code for fifteen minutes.
--
-- The lock is deliberately invisible: a locked account returns false, the
-- same value as a wrong code and a username that does not exist. Anything
-- else would turn this into a way to find out which usernames are real.

alter table public.recovery_codes
  add column if not exists failed_attempts int not null default 0,
  add column if not exists locked_until timestamptz;

-- ============================================ issuing, now password-gated
drop function if exists public.set_recovery_code(text);

create or replace function public.set_recovery_code(p_code text, p_password text)
returns void
language plpgsql
security definer
set search_path = extensions, public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_stored   text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_code is null or length(p_code) < 12 then
    raise exception 'recovery code too short' using errcode = '22023';
  end if;

  -- Same bcrypt-in-auth.users dependency the redeem path already carries;
  -- see 20260912030000. If it ever stops holding, this raises rather than
  -- quietly letting anyone issue a code.
  select encrypted_password into v_stored
  from auth.users
  where id = v_uid;

  if v_stored is null then
    raise exception 'cannot verify password for this account' using errcode = '42501';
  end if;

  if p_password is null or crypt(p_password, v_stored) <> v_stored then
    raise exception 'wrong password' using errcode = '28P01';
  end if;

  insert into public.recovery_codes (user_id, code_hash, created_at, used_at, failed_attempts, locked_until)
  values (v_uid, crypt(p_code, gen_salt('bf')), now(), null, 0, null)
  on conflict (user_id) do update
    set code_hash = excluded.code_hash,
        created_at = now(),
        used_at = null,
        failed_attempts = 0,
        locked_until = null;
end;
$$;

revoke all on function public.set_recovery_code(text, text) from public, anon;
grant execute on function public.set_recovery_code(text, text) to authenticated;

-- ============================================== redeeming, now throttled
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
  v_rec  public.recovery_codes%rowtype;
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

  return true;
end;
$$;

revoke all on function public.redeem_recovery_code(text, text, text) from public;
grant execute on function public.redeem_recovery_code(text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
