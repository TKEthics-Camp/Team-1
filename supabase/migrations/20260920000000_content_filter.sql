-- Stops published text carrying slurs, and does it where it cannot be
-- skipped.
--
-- WHAT WAS ACTUALLY WRONG
-- hobbyFilter.js has screened hobby names since the app was written, which
-- gave the impression the app filtered content. It did not. Journal entries
-- and photo captions — the only text that ever reaches another child — went
-- out completely unchecked, and the check that did exist ran in the browser
-- where anyone can skip it.
--
-- WHAT IS AND IS NOT FILTERED
-- Private entries are left alone. A child's own diary is their own, and an
-- app that refuses to let a fourteen-year-old write down that someone swore
-- at them is not protecting anybody. The rule applies at the moment the
-- text stops being private, because that is when the words become other
-- people's problem.
--
-- Photographs and voice notes cannot be checked here at all. Nothing in
-- Postgres can look at a JPEG. Those are covered by reporting and the
-- moderation queue in 20260920010000, which is the honest answer rather
-- than a filter that pretends.
--
-- WHY A TABLE AND NOT A CONSTANT
-- The list has to be editable by whoever moderates this without a deploy,
-- because the words children actually use will not match a list written
-- today. The client keeps a bundled copy for instant feedback; this is the
-- copy that decides.

create table if not exists public.blocked_terms (
  term       text primary key,
  -- whole_word  matched only as a standalone word. For short terms that are
  --             real substrings of innocent words: "ass" in "class",
  --             "cock" in "peacock", "dick" in "predict".
  -- substring   matched anywhere, for terms with no innocent host word.
  kind       text not null check (kind in ('whole_word', 'substring')),
  added_at   timestamptz not null default now()
);

alter table public.blocked_terms enable row level security;

-- Readable by signed-in clients so the app can refresh its copy; writable by
-- nobody through the API. Moderators edit it from the dashboard.
drop policy if exists "blocked_terms_select" on public.blocked_terms;
create policy "blocked_terms_select" on public.blocked_terms
  for select to authenticated using (true);
grant select on public.blocked_terms to authenticated;
revoke insert, update, delete on public.blocked_terms from authenticated, anon;


-- Seeded from src/lib/textFilter.js, generated rather than retyped. The two
-- lists start identical; from here the table is the one that decides, and a
-- moderator can add to it without a deploy.
insert into public.blocked_terms (term, kind) values
  ($t$ass$t$, 'whole_word'),
  ($t$cock$t$, 'whole_word'),
  ($t$dick$t$, 'whole_word'),
  ($t$piss$t$, 'whole_word'),
  ($t$twat$t$, 'whole_word'),
  ($t$*逼$t$, 'whole_word'),
  ($t$a**hole$t$, 'whole_word'),
  ($t$a*shole$t$, 'whole_word'),
  ($t$b*stard$t$, 'whole_word'),
  ($t$b*tch$t$, 'whole_word'),
  ($t$bi*ch$t$, 'whole_word'),
  ($t$c*nt$t$, 'whole_word'),
  ($t$dumb*ss$t$, 'whole_word'),
  ($t$f*ck$t$, 'whole_word'),
  ($t$f*ggot$t$, 'whole_word'),
  ($t$fu*k$t$, 'whole_word'),
  ($t$fuc*$t$, 'whole_word'),
  ($t$n*gga$t$, 'whole_word'),
  ($t$n*gger$t$, 'whole_word'),
  ($t$p*ssy$t$, 'whole_word'),
  ($t$r*tard$t$, 'whole_word'),
  ($t$s*it$t$, 'whole_word'),
  ($t$sh*t$t$, 'whole_word'),
  ($t$sl*t$t$, 'whole_word'),
  ($t$wh*re$t$, 'whole_word'),
  ($t$傻*$t$, 'whole_word'),
  ($t$asshole$t$, 'substring'),
  ($t$bastard$t$, 'substring'),
  ($t$bitch$t$, 'substring'),
  ($t$cunt$t$, 'substring'),
  ($t$dumbass$t$, 'substring'),
  ($t$faggot$t$, 'substring'),
  ($t$fuck$t$, 'substring'),
  ($t$nigga$t$, 'substring'),
  ($t$nigger$t$, 'substring'),
  ($t$pussy$t$, 'substring'),
  ($t$retard$t$, 'substring'),
  ($t$shit$t$, 'substring'),
  ($t$slut$t$, 'substring'),
  ($t$whore$t$, 'substring'),
  ($t$他妈的$t$, 'substring'),
  ($t$你妈$t$, 'substring'),
  ($t$傻逼$t$, 'substring'),
  ($t$妈的$t$, 'substring'),
  ($t$妈逼$t$, 'substring'),
  ($t$婊子$t$, 'substring'),
  ($t$尼玛$t$, 'substring'),
  ($t$弱智$t$, 'substring'),
  ($t$操你$t$, 'substring'),
  ($t$智障$t$, 'substring'),
  ($t$死全家$t$, 'substring'),
  ($t$沙比$t$, 'substring'),
  ($t$混蛋$t$, 'substring'),
  ($t$煞笔$t$, 'substring'),
  ($t$狗日的$t$, 'substring'),
  ($t$王八蛋$t$, 'substring'),
  ($t$草你$t$, 'substring'),
  ($t$贱人$t$, 'substring')
on conflict (term) do nothing;

create or replace function public.text_is_blocked(p_text text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_text  text := lower(coalesce(p_text, ''));
  v_words text[];
begin
  if v_text = '' then
    return false;
  end if;

  -- Same two-tier match the client does. Splitting on the same separators
  -- matters: a filter that disagrees with the one the student saw produces
  -- a rejection they cannot explain.
  v_words := regexp_split_to_array(v_text, '[[:space:],，、.!?！？~～_/-]+');

  if exists (
    select 1 from public.blocked_terms b
    where b.kind = 'whole_word' and b.term = any(v_words)
  ) then
    return true;
  end if;

  return exists (
    select 1 from public.blocked_terms b
    where b.kind = 'substring' and position(b.term in v_text) > 0
  );
end;
$$;

-- The enforcement itself. Fires only on rows that are public, so a private
-- diary is never inspected.
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

  v_text := case tg_table_name
    when 'entries' then new.text
    when 'photos'  then new.caption
    else null
  end;

  if public.text_is_blocked(v_text) then
    raise exception 'this cannot be shared with other people because of the words in it'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists entries_content_filter on public.entries;
create trigger entries_content_filter
  before insert or update on public.entries
  for each row execute function public.reject_blocked_public_text();

drop trigger if exists photos_content_filter on public.photos;
create trigger photos_content_filter
  before insert or update on public.photos
  for each row execute function public.reject_blocked_public_text();

notify pgrst, 'reload schema';
