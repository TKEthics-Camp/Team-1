-- Recently Deleted was local-only: trashing a hobby or entry immediately
-- hard-deleted its remote row (deleteRemoteInterest/deleteRemoteEntry), and
-- a trashed photo's remote row was never touched at all. Either way, the
-- local Dexie row carrying deletedAt became the *only* copy of "this is
-- trashed" anywhere — and signing out wipes the entire local database, so
-- the 30-day grace period didn't survive a sign-out, and a trashed photo
-- would quietly reappear on the next sign-in instead.
--
-- A real, synced tombstone fixes both: deleting now sets deleted_at on the
-- remote row (all three tables, the same way), instead of hard-deleting it
-- (interests/entries) or leaving it untouched (photos). The row is only
-- actually destroyed later, for real, once the 30-day window is up.
alter table public.interests add column if not exists deleted_at timestamptz;
alter table public.entries add column if not exists deleted_at timestamptz;
alter table public.photos add column if not exists deleted_at timestamptz;

-- Trashed rows still need to reach the owner's own other devices (so trash
-- shows up everywhere, and a restore on one device is a restore
-- everywhere) — the owner's own branch of each policy is left unrestricted
-- on purpose. Only the *other-viewer* branch (classmate/educator/discoverable)
-- gains the deleted_at check, so nobody else ever sees a trashed hobby,
-- entry, or photo.
alter policy "interests_select" on public.interests
  using (
    user_id = auth.uid()
    or (
      interests.deleted_at is null
      and (
        exists (select 1 from public.users u where u.id = interests.user_id and u.discovery_enabled = true)
        or exists (
          select 1 from public.users u
          where u.id = interests.user_id and u.class_code is not null and u.class_code = public.my_class_code()
        )
      )
      and not exists (
        select 1 from public.blocks b
        where (b.user_id = auth.uid() and b.blocked_user_id = interests.user_id)
           or (b.user_id = interests.user_id and b.blocked_user_id = auth.uid())
      )
    )
  );

alter policy "entries_select" on public.entries
  using (
    exists (
      select 1 from public.interests i
      join public.users u on u.id = i.user_id
      where i.id = entries.interest_id
        and (
          i.user_id = auth.uid()
          or (
            entries.deleted_at is null
            and entries.visibility = 'public'
            and (
              u.discovery_enabled = true
              or (u.class_code is not null and u.class_code = public.my_class_code())
            )
          )
        )
    )
  );

alter policy "photos_select" on public.photos
  using (
    exists (
      select 1 from public.interests i
      join public.users u on u.id = i.user_id
      where i.id = photos.interest_id
        and (
          i.user_id = auth.uid()
          or (
            photos.deleted_at is null
            and photos.visibility = 'public'
            and (
              u.discovery_enabled = true
              or (u.class_code is not null and u.class_code = public.my_class_code())
            )
          )
        )
    )
  );
