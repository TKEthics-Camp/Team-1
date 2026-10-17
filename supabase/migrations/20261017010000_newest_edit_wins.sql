-- An older edit can no longer overwrite a newer one (PRD §14.6).
--
-- THE GAP
-- A record edited on two devices kept whichever copy reached the server
-- last, not whichever was written last. A phone that had been offline
-- since Tuesday could come back on Friday and quietly replace Thursday's
-- edit from the laptop with its own stale copy.
--
-- THE FIX
-- Every edit is stamped with when it was made (updated_at, set by the app
-- at the moment of the edit, not at the moment of the push). This trigger
-- then refuses any update that carries an older stamp than the row already
-- has: the update is skipped and the newer row stays. The app, for its
-- part, pulls the newer copy down when it next reconciles.
--
-- Equal stamps are allowed through, because bookkeeping that is not an
-- edit — a photo's storage path arriving after its upload, a moderator
-- hiding something — reuses the same stamp.
--
-- photos had no updated_at; it gets one, filled from created_at for every
-- existing row so nothing looks newer or older than it is.

alter table public.photos
  add column if not exists updated_at timestamptz;
update public.photos set updated_at = created_at where updated_at is null;
alter table public.photos alter column updated_at set default now();

create or replace function public.keep_newest_edit()
returns trigger
language plpgsql
as $$
begin
  if new.updated_at is not null
     and old.updated_at is not null
     and new.updated_at < old.updated_at then
    return null;  -- skip this update; the row on the server is newer
  end if;
  return new;
end;
$$;

-- Named to run first (triggers fire in name order), so a stale write is
-- dropped before the content filter or the disclosure lock look at it.
drop trigger if exists aa_keep_newest_edit on public.interests;
create trigger aa_keep_newest_edit
  before update on public.interests
  for each row execute function public.keep_newest_edit();

drop trigger if exists aa_keep_newest_edit on public.entries;
create trigger aa_keep_newest_edit
  before update on public.entries
  for each row execute function public.keep_newest_edit();

drop trigger if exists aa_keep_newest_edit on public.photos;
create trigger aa_keep_newest_edit
  before update on public.photos
  for each row execute function public.keep_newest_edit();

notify pgrst, 'reload schema';
