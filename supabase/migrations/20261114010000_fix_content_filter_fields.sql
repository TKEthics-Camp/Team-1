-- Public entries and photos could not be saved at all.
--
-- THE BUG
-- reject_blocked_public_text() (20260920000000) picked the text to check
-- with one CASE expression naming both new.text and new.caption. PL/pgSQL
-- prepares a whole expression before running it, field references and all,
-- so on an entries row the mention of new.caption failed — "record "new"
-- has no field "caption"" — even though that branch would never run, and
-- the same the other way round for photos. Private rows return before that
-- line, so only public ones hit it: every public entry and every public
-- photo was refused by the server. The app kept them as "waiting to sync"
-- and retried forever; nothing shared ever reached Explore.
--
-- Found by running the migrations and privacy checks on a real Postgres in
-- the test suite (src/test/database.test.js), which now guards it.
--
-- THE FIX
-- Each field is read in its own statement, which is only prepared when its
-- branch runs.

create or replace function public.reject_blocked_public_text()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_text text;
begin
  if new.visibility is distinct from 'public' then
    return new;
  end if;

  if tg_table_name = 'entries' then
    v_text := new.text;
  elsif tg_table_name = 'photos' then
    v_text := new.caption;
  end if;

  if public.text_is_blocked(v_text) then
    raise exception 'this cannot be shared with other people because of the words in it'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';
