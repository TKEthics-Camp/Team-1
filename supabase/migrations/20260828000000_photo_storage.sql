-- Real photo storage. Files live at `{user_id}/{photo_id}.jpg` in a
-- private bucket (not Supabase's "public bucket" flag, which would let
-- anyone with a URL read a file with no permission check at all — photos
-- have the same private-by-default rules as everything else, so access has
-- to go through RLS-style policies on storage.objects, same as any table).
--
-- These policies mirror photos_select/photos_insert_own/photos_delete_own
-- on the public.photos table (see 20260723000000_multi_user_schema.sql) —
-- a file's own visibility is only meaningful once its row says so, so the
-- storage policy joins back to that row instead of re-deriving the rule
-- from the path alone.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "photos_storage_select" on storage.objects
  for select using (
    bucket_id = 'photos'
    and exists (
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
  );

create policy "photos_storage_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "photos_storage_delete_own" on storage.objects
  for delete using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
