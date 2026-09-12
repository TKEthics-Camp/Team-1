-- There was no way for anyone to delete their account. public.users had
-- select/insert/update policies and no delete, no UI offered it, and the
-- row that actually owns everything lives in auth.users, which a client
-- can't touch at all. For an app whose users are children that isn't a
-- missing feature, it's a missing right — GDPR erasure and COPPA's
-- parental-deletion requirement both assume it exists.
--
-- Deleting the auth.users row cascades the whole graph: public.users
-- references it `on delete cascade`, and interests/photos/entries/watches/
-- reports/blocks/classes all cascade from public.users in turn. Storage is
-- the exception — objects are rows in storage.objects keyed by a path, with
-- no foreign key to any of this — so those are removed explicitly first.
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

  -- Both buckets store under a top-level folder named for the owner's uid
  -- (see the storage policies in 20260828000000 and 20260908050000), which
  -- is what makes this a clean sweep rather than a per-row lookup.
  delete from storage.objects
  where bucket_id in ('photos', 'voice-notes')
    and (storage.foldername(name))[1] = v_uid::text;

  -- Everything in public.* hangs off this by cascade.
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
