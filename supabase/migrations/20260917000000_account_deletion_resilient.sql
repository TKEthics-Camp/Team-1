-- Makes delete_my_account survive the permission it was most likely to trip
-- on, and say something useful when it trips on the other one.
--
-- 20260912010000 warned that this function reaches into two schemas the
-- project does not own, and that a missing grant would fail at runtime
-- rather than at migration time. That is what happened: the migration
-- installed, the existence check passed, and the button errors when a
-- student taps it.
--
-- Two separate reaches, with very different consequences:
--
--   storage.objects  Deleting rows here by hand is a different permission
--                    from asking the Storage API to remove a file, and it
--                    is the more fragile of the two. The client now sweeps
--                    both buckets through the API before calling this (see
--                    deleteMyAccount in lib/remote.js), so this copy is
--                    belt-and-braces. It must not be able to abort the
--                    deletion: a leftover file is a storage bill, an
--                    account that cannot be deleted is a rights problem.
--
--   auth.users       This one is load-bearing. There is no way to erase an
--                    account without it, so if it fails the function has to
--                    fail — but it should fail saying exactly what is wrong
--                    and what to do, not with a bare permission error that
--                    reaches the student as "couldn't delete the account".

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

  -- Best effort, deliberately swallowed. The client has already removed
  -- these through the Storage API by the time we get here.
  begin
    delete from storage.objects
    where bucket_id in ('photos', 'voice-notes')
      and (storage.foldername(name))[1] = v_uid::text;
  exception when others then
    raise warning 'delete_my_account: storage sweep skipped (%)', sqlerrm;
  end;

  -- Everything in public.* cascades from this row.
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
