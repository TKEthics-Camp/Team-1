-- photos_storage_select (see 20260828000000_photo_storage.sql) required a
-- matching public.photos row whose storage_path already equals the object
-- being accessed. That's fine for viewing an established photo, but it's a
-- chicken-and-egg problem for a brand-new upload: uploadPhotoBlob (see
-- remote.js) uses upsert:true, and Supabase's upsert path checks for an
-- existing object first — a check gated by this same SELECT policy. At
-- that moment the photos row's storage_path is still null (it only gets
-- set *after* a successful upload), so the policy could never say yes,
-- and the whole upload failed with a misleading "row-level security"
-- error that had nothing to do with who was asking.
--
-- Fix: a user can always see objects in their own folder, full stop — no
-- need to consult the photos table for that case at all. The table-driven
-- check (own row, or public + discoverable/same-class) still gates access
-- to everyone else's photos exactly as before.
drop policy if exists "photos_storage_select" on storage.objects;
create policy "photos_storage_select" on storage.objects
  for select using (
    bucket_id = 'photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.photos p
        join public.interests i on i.id = p.interest_id
        join public.users u on u.id = i.user_id
        where p.storage_path = storage.objects.name
          and (
            i.user_id = auth.uid()
            or (
              p.visibility = 'public'
              and (
                u.discovery_enabled = true
                or (u.class_code is not null and u.class_code = public.my_class_code())
              )
            )
          )
      )
    )
  );
