-- A parent can take back their permission, or have the account deleted.
--
-- Until now a guardian could agree and never un-agree. The schema had a
-- 'revoked' status on guardian_consents and nothing that set it. COPPA gives
-- a parent the right to refuse further collection and to direct deletion of
-- what was collected; Apple 5.1.1(ii) requires "an easily accessible and
-- understandable way to withdraw consent". The link in the consent email is
-- the only thing the guardian holds, so the link is how they withdraw: the
-- same token that proved they were asked is what proves they can take it
-- back.
--
-- WITHDRAWN IS ITS OWN STATE, NOT PENDING
-- The obvious move — put the account back to 'pending' — would hand control
-- straight back to the child: the waiting screen accepts a class code
-- (20260926000000) and can send a fresh request to any address. A parent
-- saying no would last until their child typed a code. 'withdrawn' cannot
-- write, cannot join a class, cannot start a new request, and can see nobody
-- else. The only ways out are the guardian changing their mind through the
-- same link, which is not built, or deletion.

alter table public.users drop constraint if exists users_consent_state_check;
alter table public.users add constraint users_consent_state_check
  check (consent_state in ('not_required', 'pending', 'active', 're_consent_required', 'withdrawn'));

create or replace function public.consent_allows_writing()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select u.consent_state not in ('pending', 'withdrawn') from public.users u where u.id = auth.uid()),
    true
  );
$$;

-- Internal: the consent record a guardian's link points at. Never granted
-- to anyone — only the functions below call it.
create or replace function public._consent_for_token(p_token text)
returns public.guardian_consents
language plpgsql
stable
security definer
set search_path = extensions, public, pg_temp
as $$
declare
  v_sha text;
  v_rec public.guardian_consents%rowtype;
begin
  if p_token is null or length(p_token) < 32 then
    return null;
  end if;
  v_sha := encode(digest(p_token, 'sha256'), 'hex');
  select * into v_rec from public.guardian_consents
  where (step1_token_sha = v_sha or step2_token_sha = v_sha)
    and status in ('pending', 'active', 'revoked')
  limit 1;
  if not found then
    return null;
  end if;
  return v_rec;
end;
$$;
revoke all on function public._consent_for_token(text) from public, anon, authenticated;

-- What the guardian's page shows. Now also answers for a withdrawn record,
-- because a parent who withdrew may come back to delete, and "this link
-- doesn't work" would strand them.
create or replace function public.describe_guardian_consent(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = extensions, public, pg_temp
as $$
declare
  v_rec  public.guardian_consents;
  v_sha  text;
  v_name text;
begin
  v_rec := public._consent_for_token(p_token);
  if v_rec.id is null then
    return jsonb_build_object('result', 'invalid');
  end if;
  v_sha := encode(digest(p_token, 'sha256'), 'hex');
  select display_name into v_name from public.users where id = v_rec.user_id;

  return jsonb_build_object(
    'result', 'ok',
    'status', v_rec.status,
    'step', case when v_rec.step1_token_sha = v_sha then 1 else 2 end,
    'child_name', coalesce(v_name, ''),
    'terms_version', v_rec.terms_version,
    'privacy_version', v_rec.privacy_version,
    'step1_confirmed_at', v_rec.step1_confirmed_at,
    'step2_confirmed_at', v_rec.step2_confirmed_at,
    'step2_not_before', v_rec.step2_not_before
  );
end;
$$;
revoke all on function public.describe_guardian_consent(text) from public;
grant execute on function public.describe_guardian_consent(text) to anon, authenticated;

create or replace function public.withdraw_guardian_consent(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rec public.guardian_consents;
begin
  v_rec := public._consent_for_token(p_token);
  if v_rec.id is null then
    return jsonb_build_object('result', 'invalid');
  end if;
  if v_rec.status = 'revoked' then
    return jsonb_build_object('result', 'already');
  end if;

  update public.guardian_consents set status = 'revoked' where id = v_rec.id;

  -- A step-two email still queued must not go out after the parent said no.
  delete from public.consent_outbox where consent_id = v_rec.id and sent_at is null;

  -- Shut everything, in one write: no logging (consent_allows_writing), no
  -- class, nobody visible in either direction. class_code is cleared under
  -- its own flag because the class guard (20260912000000) refuses it
  -- otherwise, and the disclosure lock refuses a locked account that still
  -- holds one.
  perform set_config('app.consent_write', 'on', true);
  perform set_config('app.class_join', 'on', true);
  update public.users
  set consent_state = 'withdrawn',
      disclosure_locked = true,
      discovery_enabled = false,
      default_visibility = 'private',
      class_code = null
  where id = v_rec.user_id;
  perform set_config('app.class_join', 'off', true);
  perform set_config('app.consent_write', 'off', true);

  return jsonb_build_object('result', 'ok');
end;
$$;
revoke all on function public.withdraw_guardian_consent(text) from public;
grant execute on function public.withdraw_guardian_consent(text) to anon, authenticated;

-- Deletes the child's account and everything in it, on the guardian's word.
-- Same two steps as delete_my_account: a best-effort sweep of both storage
-- buckets, then the auth row, from which everything in public.* cascades —
-- including this consent record and the guardian's address, which a parent
-- asking for deletion is entitled to have go too.
create or replace function public.delete_account_as_guardian(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rec public.guardian_consents;
begin
  v_rec := public._consent_for_token(p_token);
  if v_rec.id is null then
    return jsonb_build_object('result', 'invalid');
  end if;

  begin
    delete from storage.objects
    where bucket_id in ('photos', 'voice-notes')
      and (storage.foldername(name))[1] = v_rec.user_id::text;
  exception when others then
    raise warning 'delete_account_as_guardian: storage sweep skipped (%)', sqlerrm;
  end;

  delete from auth.users where id = v_rec.user_id;
  return jsonb_build_object('result', 'ok');
end;
$$;
revoke all on function public.delete_account_as_guardian(text) from public;
grant execute on function public.delete_account_as_guardian(text) to anon, authenticated;

notify pgrst, 'reload schema';
