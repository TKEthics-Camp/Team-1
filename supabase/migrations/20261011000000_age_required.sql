-- A new account can do nothing until it has given its age.
--
-- THE HOLE
-- protect_consent_columns (20260918000000) started every new users row as
-- 'not_required' and unlocked, and relied on the client calling
-- apply_age_gate straight afterwards to move it. Two ways round that:
--
--   the gate call fails (network drop, closed tab), AuthFlow signs the
--     account out, and the account is still there — log back in later and
--     it is a full, ungated account with no birthdate;
--   anyone calling the API directly simply never calls the gate.
--
-- Either way an under-14 could end up sharing publicly with no guardian
-- ever asked. The client used to make this worse on purpose: it let signup
-- through when the gate function was missing (John's notes, "missing-function
-- bypass"). That is removed in the same change as this file.
--
-- THE FIX
-- New individual accounts start in 'age_required' and locked. That state
-- cannot write (consent_allows_writing) and, being locked, cannot see or be
-- seen by anybody (viewer_is_disclosure_locked, the lock triggers).
-- apply_age_gate is the only way out, and it already sets both columns, so
-- it needs no change. The app shows a "when were you born?" screen for this
-- state, so an account stranded by a failed signup can finish the job.
--
-- Educator accounts start 'not_required' exactly as before: they never pass
-- through the gate. Existing accounts are untouched — this only changes what
-- an INSERT starts as ("new signups only").

alter table public.users drop constraint if exists users_consent_state_check;
alter table public.users add constraint users_consent_state_check
  check (consent_state in ('not_required', 'age_required', 'pending', 'active', 're_consent_required', 'withdrawn'));

create or replace function public.protect_consent_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(current_setting('app.consent_write', true), '') = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- handle_new_user creates this row at signup and has no business
    -- setting any of these; a hand-rolled insert claiming 'active' has
    -- even less. Only apply_age_gate moves an account on from here.
    new.birthdate := null;
    if new.account_type = 'org' then
      new.consent_state     := 'not_required';
      new.disclosure_locked := false;
    else
      new.consent_state     := 'age_required';
      new.disclosure_locked := true;
    end if;
    return new;
  end if;

  new.birthdate         := old.birthdate;
  new.consent_state     := old.consent_state;
  new.disclosure_locked := old.disclosure_locked;
  return new;
end;
$$;

create or replace function public.consent_allows_writing()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select u.consent_state not in ('age_required', 'pending', 'withdrawn') from public.users u where u.id = auth.uid()),
    true
  );
$$;

notify pgrst, 'reload schema';
