-- Moderators can open reported files only — never every student's files.
--
-- Two branches fixed "the moderator can't see a reported photo" at the same
-- time. feature/zach (20260927000000, since removed from the repository)
-- added is_moderator() to the ordinary storage read policies, which let a
-- moderator open every photo and voice note in the project, private ones
-- included. feature/eric (20261011010000, applied) gave moderators a
-- separate policy that reaches only files under an open report. The second
-- is the one the app uses, and the narrower one is the right default for a
-- product used by children.
--
-- If 20260927000000 was ever run on this project, this puts the two
-- ordinary policies back to what they were before it (20260902000000 and
-- 20260908050000), with no moderator clause. If it never ran, this changes
-- nothing: the definitions below are the ones already in place.

alter policy "photos_storage_select" on storage.objects
  using (
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

alter policy "voice_notes_storage_select" on storage.objects
  using (
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

-- The age-gate bypass log from the same branch (20260928000000, also
-- removed) recorded signups that went through when the age gate was
-- missing. The app no longer lets any signup through without the gate
-- (20261011000000), so there is nothing left for it to record. Dropped if
-- it was ever created.
drop table if exists public.age_gate_bypass_log;

notify pgrst, 'reload schema';
