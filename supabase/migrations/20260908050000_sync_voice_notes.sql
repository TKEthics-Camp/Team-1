-- Voice notes only ever lived as a local Blob on entries — no column, no
-- Storage bucket. A sign-out (which wipes local storage) or a second
-- device lost a recording for good. Mirrors the photos storage setup
-- exactly (20260828000000_photo_storage.sql, 20260830000000_photo_storage_update_policy.sql,
-- 20260902000000_photo_storage_select_fix.sql): a private bucket, own-folder-first
-- for select (so a brand-new upload isn't blocked by a chicken-and-egg
-- check against a row that doesn't have the path yet), and access
-- otherwise following the same visibility/discoverable/class-code rule as
-- everything else.
alter table public.entries
  add column if not exists audio_path text,
  add column if not exists audio_ms integer;

insert into storage.buckets (id, name, public)
values ('voice-notes', 'voice-notes', false)
on conflict (id) do nothing;

create policy "voice_notes_storage_select" on storage.objects
  for select using (
    bucket_id = 'voice-notes'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.entries e
        join public.interests i on i.id = e.interest_id
        join public.users u on u.id = i.user_id
        where e.audio_path = storage.objects.name
          and (
            i.user_id = auth.uid()
            or (
              e.visibility = 'public'
              and (
                u.discovery_enabled = true
                or (u.class_code is not null and u.class_code = public.my_class_code())
              )
            )
          )
      )
    )
  );

create policy "voice_notes_storage_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'voice-notes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "voice_notes_storage_update_own" on storage.objects
  for update
  using (
    bucket_id = 'voice-notes'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'voice-notes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "voice_notes_storage_delete_own" on storage.objects
  for delete using (
    bucket_id = 'voice-notes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
