-- The moderation queue already sends a moderator the reported text or
-- caption (see moderation_queue() in 20260920010000), but never the actual
-- photo or voice note — the review screen showed "(no text — a photo or
-- voice note)" for exactly the reports that most need a human to actually
-- look or listen. Fixing the screen alone wouldn't have been enough: a
-- moderator has no storage access to someone else's private photo or voice
-- note at all today, since photos_storage_select/voice_notes_storage_select
-- only ever consult ownership, visibility and class/discoverable — nothing
-- in either policy has ever heard of is_moderator(). A reported item is, by
-- definition, exactly the content most likely to still be private.

alter policy "photos_storage_select" on storage.objects
  using (
    bucket_id = 'photos'
    and (
      public.is_moderator()
      or (storage.foldername(name))[1] = auth.uid()::text
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
      public.is_moderator()
      or (storage.foldername(name))[1] = auth.uid()::text
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

-- Now that a moderator can actually reach the file, the queue needs to
-- hand back where it is. storage_path/audio_path travel alongside the same
-- text/caption content already selected — a report with neither (e.g. a
-- voice-note-only entry) is exactly the case the old placeholder covered
-- for, so both are included rather than picking one.
create or replace function public.moderation_queue()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows jsonb;
begin
  if not public.is_moderator() then
    raise exception 'not a moderator' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(row_to_json(r)::jsonb order by r.created_at), '[]'::jsonb)
  into v_rows
  from (
    select
      rep.id, rep.target_type, rep.target_id, rep.reason, rep.status, rep.created_at,
      reporter.display_name as reporter_name,
      case rep.target_type
        when 'entry'    then (select e.text    from public.entries e   where e.id = rep.target_id)
        when 'photo'    then (select p.caption from public.photos p    where p.id = rep.target_id)
        when 'interest' then (select i.name    from public.interests i where i.id = rep.target_id)
        when 'user'     then (select u.display_name from public.users u where u.id::text = rep.target_id)
      end as content,
      case rep.target_type
        when 'photo' then (select p.storage_path from public.photos p where p.id = rep.target_id)
      end as storage_path,
      case rep.target_type
        when 'entry' then (select e.audio_path from public.entries e where e.id = rep.target_id)
      end as audio_path,
      case rep.target_type
        when 'entry' then (select e.audio_ms from public.entries e where e.id = rep.target_id)
      end as audio_ms,
      case rep.target_type
        when 'entry'    then (select e.hidden_at is not null from public.entries e   where e.id = rep.target_id)
        when 'photo'    then (select p.hidden_at is not null from public.photos p    where p.id = rep.target_id)
        when 'interest' then (select i.hidden_at is not null from public.interests i where i.id = rep.target_id)
        else false
      end as is_hidden
    from public.reports rep
    left join public.users reporter on reporter.id = rep.reporter_id
    where rep.status = 'open'
    order by rep.created_at
    limit 200
  ) r;

  return v_rows;
end;
$$;

revoke all on function public.moderation_queue() from public, anon;
grant execute on function public.moderation_queue() to authenticated;
