-- Two fixes to how a class code interacts with the age gate.
--
-- 1. SIGNING UP WITH A CLASS CODE WAS BROKEN
-- 20260912000000 freezes users.class_code behind a guard trigger: it may only
-- move while app.class_join is 'on', which join_class() sets. apply_age_gate
-- (20260918000000) wrote class_code with only its own app.consent_write flag
-- set, so the guard raised. Every signup that entered a valid class code
-- failed the gate, AuthFlow rolled the account back, and the student landed
-- on the welcome screen holding a raw error about join_class(). That is the
-- school path — the one meant to need no guardian email at all.
--
-- 2. A CHILD STUCK IN PENDING HAD NO WAY OUT
-- An under-14 signing up alone waits on two guardian emails. If those never
-- come — wrong address, a parent who never checks, a sender not yet deployed
-- — the child waits forever. The waiting screen now accepts a class code.
-- This is not a loophole: the same code is accepted at signup, and it moves
-- the account onto the path the school's consent covers, which is the design
-- in 20260918000000, not an exception to it.

create or replace function public.apply_age_gate(
  p_birthdate  date,
  p_class_code text default null
)
returns text
language plpgsql
security definer
set search_path = extensions, public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_is_org    boolean;
  v_under_14  boolean;
  v_has_class boolean;
  v_code      text := upper(trim(coalesce(p_class_code, '')));
  v_state     text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_birthdate is null then
    raise exception 'birthdate is required' using errcode = '22023';
  end if;
  if p_birthdate > current_date or p_birthdate < current_date - interval '120 years' then
    raise exception 'birthdate is not a real date' using errcode = '22023';
  end if;

  select u.account_type = 'org' into v_is_org from public.users u where u.id = v_uid;

  if exists (select 1 from public.users u where u.id = v_uid and u.birthdate is not null) then
    raise exception 'birthdate is already set for this account' using errcode = '22023';
  end if;

  v_under_14  := p_birthdate > (current_date - interval '14 years');
  v_has_class := v_code <> '' and exists (select 1 from public.classes c where c.code = v_code);

  v_state := case when v_is_org or not v_under_14 or v_has_class
                  then 'not_required' else 'pending' end;

  -- Both flags: consent_write for the consent columns, class_join for
  -- class_code. The missing second one is the whole bug.
  perform set_config('app.consent_write', 'on', true);
  perform set_config('app.class_join', 'on', true);
  update public.users
  set birthdate = p_birthdate,
      consent_state = v_state,
      disclosure_locked = false,
      class_code = case when v_has_class then v_code else class_code end
  where id = v_uid;
  perform set_config('app.class_join', 'off', true);
  perform set_config('app.consent_write', 'off', true);

  return v_state;
end;
$$;

revoke all on function public.apply_age_gate(date, text) from public, anon;
grant execute on function public.apply_age_gate(date, text) to authenticated;

-- The way out of pending. Returns false for a code that does not exist,
-- matching join_class(), so a typo reads as a typo rather than an error.
create or replace function public.join_class_from_pending(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not exists (select 1 from public.users where id = v_uid and consent_state = 'pending') then
    raise exception 'this account is not waiting on guardian consent' using errcode = '42501';
  end if;

  if v_code = '' or not exists (select 1 from public.classes where code = v_code) then
    return false;
  end if;

  perform set_config('app.consent_write', 'on', true);
  perform set_config('app.class_join', 'on', true);
  update public.users
  set class_code = v_code,
      consent_state = 'not_required'
  where id = v_uid;
  perform set_config('app.class_join', 'off', true);
  perform set_config('app.consent_write', 'off', true);

  -- The guardian request no longer applies. Superseded rather than deleted,
  -- so the record of what was asked survives; unsent emails are withdrawn so
  -- a parent is not asked to approve something that has already been
  -- settled another way.
  delete from public.consent_outbox
  where sent_at is null
    and consent_id in (select id from public.guardian_consents
                       where user_id = v_uid and status = 'pending');

  update public.guardian_consents
  set status = 'superseded'
  where user_id = v_uid and status = 'pending';

  return true;
end;
$$;

revoke all on function public.join_class_from_pending(text) from public, anon;
grant execute on function public.join_class_from_pending(text) to authenticated;

notify pgrst, 'reload schema';
