-- Collapses the per-orb visibility toggle into two account-level paths
-- instead: a hobby (and its public journal entries) is visible to someone
-- else if either (a) the owning account has "let others find me" on, or
-- (b) the viewer shares the same class_code as the owner — a classmate or
-- educator, who shouldn't need the owner to also be globally discoverable
-- to see them. There's no longer a separate private/public choice made
-- per tree; two settings for one idea was confusing and easy to set
-- inconsistently (public tree, private account — or the reverse).
--
-- interests.visibility stays in the schema (nothing here drops a column)
-- but is no longer read by any policy below; the toggle itself is gone
-- from the UI (OrbSheet.jsx). Journal entries and photos keep their own
-- per-item toggle for now — only the parent-orb layer is being removed
-- here, for both access paths.

alter policy "interests_select" on public.interests
  using (
    user_id = auth.uid()
    or (
      (
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
            entries.visibility = 'public'
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
            photos.visibility = 'public'
            and (
              u.discovery_enabled = true
              or (u.class_code is not null and u.class_code = public.my_class_code())
            )
          )
        )
    )
  );
