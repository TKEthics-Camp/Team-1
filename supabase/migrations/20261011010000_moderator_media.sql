-- A moderator can see a reported photo and hear a reported voice note.
--
-- moderation_queue (20260920010000) sent the reported text along with each
-- report, and nothing else. A reported photo arrived as its caption — often
-- empty — and a reported voice note as whatever was typed beside it. The
-- moderator was deciding about the one thing they could not look at, and
-- the file itself was out of reach anyway: storage only lets the owner, or
-- someone the photo is shared with, read it, and the moderator is usually
-- neither.
--
-- Narrow on purpose. This does not make moderators able to read everybody's
-- files. It lets them read exactly the files that are the subject of an open
-- report, for as long as the report is open.

-- Security definer, like is_moderator, because a policy's own subqueries
-- run with the caller's rights: reports, photos and entries are all behind
-- RLS, and a moderator cannot see other people's reports, nor a photo that
-- has already been hidden. Asked inline, the check would always say no.
create or replace function public.moderator_can_read(p_bucket text, p_name text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_moderator() and (
    (p_bucket = 'photos' and exists (
      select 1 from public.photos p
      join public.reports r on r.target_type = 'photo' and r.target_id = p.id
      where p.storage_path = p_name and r.status = 'open'
    ))
    or
    (p_bucket = 'voice-notes' and exists (
      select 1 from public.entries e
      join public.reports r on r.target_type = 'entry' and r.target_id = e.id
      where e.audio_path = p_name and r.status = 'open'
    ))
  );
$$;

revoke all on function public.moderator_can_read(text, text) from public, anon;
grant execute on function public.moderator_can_read(text, text) to authenticated;

drop policy if exists "storage_select_moderator" on storage.objects;
create policy "storage_select_moderator" on storage.objects
  for select using (
    bucket_id in ('photos', 'voice-notes')
    and public.moderator_can_read(bucket_id, name)
  );

-- The queue again, now carrying where the file is. Everything it returned
-- before it still returns, so an app that does not know about media_path
-- yet keeps working.
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
        when 'entry'    then (select e.hidden_at is not null from public.entries e   where e.id = rep.target_id)
        when 'photo'    then (select p.hidden_at is not null from public.photos p    where p.id = rep.target_id)
        when 'interest' then (select i.hidden_at is not null from public.interests i where i.id = rep.target_id)
        else false
      end as is_hidden,
      case rep.target_type
        when 'entry' then (select e.audio_path   from public.entries e where e.id = rep.target_id)
        when 'photo' then (select p.storage_path from public.photos p  where p.id = rep.target_id)
      end as media_path
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

notify pgrst, 'reload schema';
