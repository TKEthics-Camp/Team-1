-- Blocking someone now hides you from them, as it always said it did.
--
-- THE BUG
-- Blocking is meant to work both ways: the person you block can't see you,
-- and you can't see them. The users and interests rules checked for a block
-- with a subquery on public.blocks — but a subquery inside a rule runs with
-- the reader's own permissions, and blocks_select_own only lets anyone read
-- the blocks *they* made. So when the blocked student asked "has this
-- person blocked me?", the row that said yes was invisible to them, the
-- answer was always no, and they went on seeing the blocker's profile and
-- trees. Entries and photos had no block check at all.
--
-- Found by the privacy checks (check 10), which now run on a real Postgres
-- in the test suite (src/test/database.test.js) instead of only by hand.
--
-- THE FIX
-- blocked_either_way() looks at blocks with the definer's rights, in both
-- directions, and answers only yes or no about the one other person asked
-- about — it reveals nothing else about anyone's blocks. Every rule that
-- shows one student's things to another now uses it. Storage rules read
-- through photos and entries, so files follow along.

create or replace function public.blocked_either_way(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.blocks b
    where (b.user_id = auth.uid() and b.blocked_user_id = p_other)
       or (b.user_id = p_other and b.blocked_user_id = auth.uid())
  );
$$;

revoke all on function public.blocked_either_way(uuid) from public;
grant execute on function public.blocked_either_way(uuid) to anon, authenticated;

alter policy "users_select" on public.users
  using (
    auth.uid() = id
    or (
      not public.viewer_is_disclosure_locked()
      and coalesce(disclosure_locked, false) = false
      and (
        discovery_enabled = true
        or (class_code is not null and class_code = public.my_class_code())
      )
      and not public.blocked_either_way(users.id)
    )
  );

alter policy "interests_select" on public.interests
  using (
    user_id = auth.uid()
    or (
      not public.viewer_is_disclosure_locked()
      and interests.deleted_at is null
      and interests.hidden_at is null
      and not public.i_reported('interest', interests.id)
      and (
        exists (select 1 from public.users u where u.id = interests.user_id and u.discovery_enabled = true)
        or exists (
          select 1 from public.users u
          where u.id = interests.user_id and u.class_code is not null and u.class_code = public.my_class_code()
        )
      )
      and not public.blocked_either_way(interests.user_id)
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
            not public.viewer_is_disclosure_locked()
            and entries.deleted_at is null
            and entries.hidden_at is null
            and i.hidden_at is null
            and not public.i_reported('entry', entries.id)
            and not public.i_reported('interest', i.id)
            and entries.visibility = 'public'
            and (
              u.discovery_enabled = true
              or (u.class_code is not null and u.class_code = public.my_class_code())
            )
            and not public.blocked_either_way(i.user_id)
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
            not public.viewer_is_disclosure_locked()
            and photos.deleted_at is null
            and photos.hidden_at is null
            and i.hidden_at is null
            and not public.i_reported('photo', photos.id)
            and not public.i_reported('interest', i.id)
            and photos.visibility = 'public'
            and (
              u.discovery_enabled = true
              or (u.class_code is not null and u.class_code = public.my_class_code())
            )
            and not public.blocked_either_way(i.user_id)
          )
        )
    )
  );

notify pgrst, 'reload schema';
