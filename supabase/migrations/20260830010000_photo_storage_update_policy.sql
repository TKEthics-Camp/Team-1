-- The app uploads photos with `upsert: true` (see uploadPhotoBlob in
-- src/lib/remote.js) so re-saving the same photo overwrites its file
-- instead of erroring. Postgres treats that as "insert, or update on
-- conflict" — which needs an UPDATE policy to exist on storage.objects,
-- not just insert/select/delete. Without one, even a brand-new upload
-- gets rejected, because Postgres has to know an update *would* be
-- allowed before it can commit to the insert-or-update plan.
--
-- Renumbered from 20260830000000, which collided with
-- 20260830000000_onboarding_completed.sql. Supabase keys applied migrations
-- by version, so only one of the two was ever recorded and the apply order
-- between them was undefined. Dropping first makes this safe to re-run on a
-- database that already has the policy from the old numbering.
drop policy if exists "photos_storage_update_own" on storage.objects;
create policy "photos_storage_update_own" on storage.objects
  for update
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
