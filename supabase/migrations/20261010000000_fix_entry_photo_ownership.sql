-- Entries and photos have no user_id. Ownership runs through the parent
-- interest (interest_id -> interests.user_id), and has since the first
-- schema (20260723000000).
--
-- 20260918000000 assumed otherwise in two places:
--
--   reject_disclosure_when_locked() read NEW.user_id for entries and photos.
--   That field does not exist, so the trigger raises on every insert and
--   update to either table — for every account, not only locked ones,
--   because the field is read before the lock is checked. Saving a journal
--   entry or a photo fails at the server. The app writes locally first, so
--   nothing looks wrong on screen; the work simply never reaches the
--   database.
--
--   entries_insert_own / photos_insert_own were rewritten to check
--   user_id = auth.uid(). That statement cannot have succeeded against
--   this schema, so those policies most likely still hold their originals
--   — without the consent check this file adds back.
--
-- Found by a review of the repository (Forest App Store notes, 26 Sep
-- 2026), confirmed against the live database: entries.user_id and
-- photos.user_id do not exist there either.
--
-- Safe to run whatever state the database is in: the function is replaced
-- and both policies are set to their correct form regardless of what they
-- currently say.

create or replace function public.reject_disclosure_when_locked()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_locked boolean;
begin
  if tg_table_name = 'users' then
    v_locked := new.disclosure_locked;
  else
    -- entries and photos: the owner is whoever owns the parent interest.
    select u.disclosure_locked into v_locked
    from public.interests i
    join public.users u on u.id = i.user_id
    where i.id = new.interest_id;
  end if;

  if not coalesce(v_locked, false) then
    return new;
  end if;

  if tg_table_name = 'users' then
    if coalesce(new.discovery_enabled, false) then
      raise exception 'this account was set up under a no-disclosure guardian consent and cannot be made discoverable'
        using errcode = '42501';
    end if;
    if new.class_code is not null then
      raise exception 'this account was set up under a no-disclosure guardian consent and cannot join a class'
        using errcode = '42501';
    end if;
    if new.default_visibility is distinct from 'private' then
      raise exception 'this account was set up under a no-disclosure guardian consent and cannot default to public'
        using errcode = '42501';
    end if;
  elsif tg_table_name = 'entries' then
    if new.visibility is distinct from 'private' or coalesce(new.shared_to_feed, false) then
      raise exception 'this account was set up under a no-disclosure guardian consent and cannot share entries'
        using errcode = '42501';
    end if;
  elsif tg_table_name = 'photos' then
    if new.visibility is distinct from 'private' then
      raise exception 'this account was set up under a no-disclosure guardian consent and cannot share photos'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

-- Ownership through the interest, exactly as the originals had it, plus
-- the consent check 20260918000000 meant to add: a pending or withdrawn
-- account cannot write.
alter policy "entries_insert_own" on public.entries
  with check (
    exists (select 1 from public.interests i where i.id = interest_id and i.user_id = auth.uid())
    and public.consent_allows_writing()
  );

alter policy "photos_insert_own" on public.photos
  with check (
    exists (select 1 from public.interests i where i.id = interest_id and i.user_id = auth.uid())
    and public.consent_allows_writing()
  );

notify pgrst, 'reload schema';
