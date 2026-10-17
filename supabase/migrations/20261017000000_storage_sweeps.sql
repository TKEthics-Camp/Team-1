-- Every deleted account's files get removed, even when nobody is signed in.
--
-- THE GAP (PRD §14.7)
-- A student deleting their own account is signed in, so the app removes
-- their photos and voice notes through the Storage API before the account
-- goes (lib/remote.js, deleteMyAccount). A parent deleting the account from
-- the consent email is not signed in as anyone, so there is no app to do
-- that, and the only remaining attempt was the database deleting
-- storage.objects rows directly — a permission this project may not have,
-- and which, when it fails, is skipped so the deletion itself still happens.
-- The files stayed behind with no owner, which is the opposite of what a
-- parent asking for deletion was promised.
--
-- THE FIX
-- Deleting an account now also leaves a note: "sweep this user's folders".
-- The note outlives the account on purpose (no foreign key — the user row
-- is gone by the time anyone reads it). The email worker, which already
-- runs every five minutes with the service role, reads the notes and
-- removes the files through the Storage API, the path that is known to
-- work, then deletes the note. A note that keeps failing records why.
--
-- Both deletion paths leave a note. For the student's own deletion it is
-- belt and braces: the app has already removed the files, so the sweep
-- finds nothing and simply closes the note.

create table if not exists public.storage_sweeps (
  user_id      uuid primary key,
  requested_at timestamptz not null default now(),
  attempts     int not null default 0,
  last_error   text
);

alter table public.storage_sweeps enable row level security;
-- No policies: only the definer functions below and the service role touch it.
revoke all on public.storage_sweeps from anon, authenticated;

-- For the worker. Oldest first, a bounded batch, and notes that have failed
-- many times stop being retried so one broken folder cannot block the rest.
create or replace function public.claim_storage_sweeps(p_limit int default 10)
returns setof public.storage_sweeps
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.storage_sweeps s
  set attempts = s.attempts + 1
  where s.user_id in (
    select user_id from public.storage_sweeps
    where attempts < 10
    order by requested_at
    limit greatest(1, least(p_limit, 50))
    for update skip locked
  )
  returning s.*;
$$;

revoke all on function public.claim_storage_sweeps(int) from public, anon, authenticated;
grant execute on function public.claim_storage_sweeps(int) to service_role;

-- ============================================ student deletes own account
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.storage_sweeps (user_id) values (v_uid)
  on conflict (user_id) do nothing;

  -- Best effort, deliberately swallowed. The client has already removed
  -- these through the Storage API, and the sweep note above catches
  -- anything left.
  begin
    delete from storage.objects
    where bucket_id in ('photos', 'voice-notes')
      and (storage.foldername(name))[1] = v_uid::text;
  exception when others then
    raise warning 'delete_my_account: storage sweep skipped (%)', sqlerrm;
  end;

  begin
    delete from auth.users where id = v_uid;
  exception when insufficient_privilege then
    raise exception
      'delete_my_account cannot remove the auth row: the function owner has no DELETE on auth.users. This project needs the deletion moved to an edge function using the service-role key.'
      using errcode = '42501';
  end;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ====================================== parent deletes from the email link
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

  -- Written first, so the files are swept even if everything below fails
  -- part-way.
  insert into public.storage_sweeps (user_id) values (v_rec.user_id)
  on conflict (user_id) do nothing;

  begin
    delete from storage.objects
    where bucket_id in ('photos', 'voice-notes')
      and (storage.foldername(name))[1] = v_rec.user_id::text;
  exception when others then
    raise warning 'delete_account_as_guardian: storage sweep deferred to the worker (%)', sqlerrm;
  end;

  delete from auth.users where id = v_rec.user_id;
  return jsonb_build_object('result', 'ok');
end;
$$;

revoke all on function public.delete_account_as_guardian(text) from public;
grant execute on function public.delete_account_as_guardian(text) to anon, authenticated;

notify pgrst, 'reload schema';
