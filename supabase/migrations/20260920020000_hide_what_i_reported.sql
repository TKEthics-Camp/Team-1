-- What you report stays gone for you, whether or not a moderator has looked
-- at it yet.
--
-- Reporting removed the row from the screen and nothing else, so a refresh
-- brought it straight back. A child who reported something upsetting saw it
-- reappear, which reads as the report having been ignored — and teaches
-- them not to bother next time. That is the opposite of what the button is
-- for.
--
-- Two different jobs, kept separate on purpose:
--
--   moderate_hide   an adult's decision, applies to everybody
--   this file       the reporter's own view, applies immediately and only
--                   to them
--
-- The second must not wait on the first. A moderator might take a day, and
-- the child should not be looking at it in the meantime. Nobody else's view
-- changes: one child reporting something does not remove it for everyone,
-- which would make the report button a censorship button.

create index if not exists reports_reporter_target_idx
  on public.reports (reporter_id, target_type, target_id);

create or replace function public.i_reported(p_type text, p_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.reports r
    where r.reporter_id = auth.uid()
      and r.target_type = p_type
      and r.target_id = p_id
  );
$$;

revoke all on function public.i_reported(text, text) from public, anon;
grant execute on function public.i_reported(text, text) to authenticated;

-- The three visibility policies again, carrying everything they already
-- carried — deleted_at, hidden_at, the disclosure lock, blocks — plus this.
-- Own rows stay untouched in all three: you can always see your own work,
-- and you cannot report yourself into invisibility.
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
          )
        )
    )
  );

notify pgrst, 'reload schema';
