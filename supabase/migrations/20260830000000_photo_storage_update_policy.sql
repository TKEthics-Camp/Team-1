-- The app uploads photos with `upsert: true` (see uploadPhotoBlob in
-- src/lib/remote.js) so re-saving the same photo overwrites its file
-- instead of erroring. Postgres treats that as "insert, or update on
-- conflict" — which needs an UPDATE policy to exist on storage.objects,
-- not just insert/select/delete. Without one, even a brand-new upload
-- gets rejected, because Postgres has to know an update *would* be
-- allowed before it can commit to the insert-or-update plan.
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
