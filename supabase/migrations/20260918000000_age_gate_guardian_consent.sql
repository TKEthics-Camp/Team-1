-- An age gate, and consent for under-14s who sign up alone.
--
-- PRD §14.2 has said since the first draft that nothing in this app asks how
-- old anyone is. This is the first half of closing that: a birthdate at
-- signup, and for a child under 14 with no class behind them, a guardian's
-- agreement collected twice before the account can do anything.
--
-- WHICH CONSENT STANDARD THIS IMPLEMENTS, AND WHAT IT COSTS
-- COPPA allows a lighter consent method when the information collected is
-- used internally and never disclosed — the method the rule describes is a
-- message to the guardian followed by a second, delayed confirmation. That
-- lighter standard is only available for as long as the no-disclosure
-- promise holds. So the promise is enforced here in the database rather
-- than in the UI: an account consented this way can never be discoverable,
-- never appear in search, never share an entry, and never reach the feed,
-- because the writes that would do any of those raise.
--
-- This is the part that must not be loosened later by a well-meaning
-- change to a screen. If sharing is ever wanted for one of these accounts,
-- the consent record has to be replaced with one taken under the heavier
-- standard — which is exactly what the 14th-birthday path below does.
--
-- THE CHANNEL
-- Email, because the rule this lighter standard comes from is written
-- around email specifically, and because SMS into mainland China needs
-- pre-registered templates and an ICP-backed sender — a guardian who never
-- receives the message leaves their child stuck in pending forever.
-- The channel is stored on every record and the queue is transport-neutral,
-- so moving to SMS later costs a worker and nothing else.
--
-- SCOPE: new signups only, by decision. Accounts that already exist keep a
-- null birthdate and consent_state 'not_required'. Nothing here reaches
-- back and changes them.

-- ========================================================= users columns
alter table public.users
  add column if not exists birthdate date,
  -- not_required        adult, educator, or an account predating the gate
  -- pending             under 14, alone, guardian has not finished
  -- active              guardian finished both steps; logging allowed
  -- re_consent_required turned 14 on a no-disclosure consent (see below)
  add column if not exists consent_state text not null default 'not_required',
  -- Denormalised from guardian_consents so every policy and trigger can
  -- check it without a join. guardian_consents is the source of truth;
  -- this is the enforcement handle.
  add column if not exists disclosure_locked boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_consent_state_check'
  ) then
    alter table public.users add constraint users_consent_state_check
      check (consent_state in ('not_required', 'pending', 'active', 're_consent_required'));
  end if;
end
$$;

-- ==================================================== guardian_consents
create table if not exists public.guardian_consents (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users (id) on delete cascade,
  kind                text not null default 'u14_internal_only'
                        check (kind in ('u14_internal_only')),

  -- Stored because the record has to be able to show, years later, who was
  -- asked and how they were reached. Never readable by any client: see the
  -- grants at the bottom — this table has RLS on and no policies at all.
  guardian_channel    text not null default 'email' check (guardian_channel in ('sms', 'email')),
  guardian_contact      text not null,

  -- Two separate confirmations, not one. The second is what makes this a
  -- lighter-standard consent rather than a single tap by whoever happened
  -- to be holding the phone.
  step1_token_sha     text,
  step1_sent_at       timestamptz,
  step1_confirmed_at  timestamptz,
  step2_token_sha     text,
  step2_sent_at       timestamptz,
  step2_confirmed_at  timestamptz,
  -- The delay between them. Nothing will send step 2 before this.
  step2_not_before    timestamptz,

  -- What the guardian was actually shown. A consent record that cannot say
  -- which version of the terms was on screen is not evidence of anything.
  terms_version       text not null,
  privacy_version     text not null,

  status              text not null default 'pending'
                        check (status in ('pending', 'active', 'revoked', 'superseded')),
  failed_attempts     int not null default 0,
  created_at          timestamptz not null default now(),
  activated_at        timestamptz
);

-- One live consent per account. Revoked and superseded records stay for the
-- audit trail; they are what proves the 14th-birthday transition happened.
create unique index if not exists guardian_consents_one_live_idx
  on public.guardian_consents (user_id)
  where status in ('pending', 'active');

create index if not exists guardian_consents_step1_token_idx
  on public.guardian_consents (step1_token_sha) where step1_token_sha is not null;
create index if not exists guardian_consents_step2_token_idx
  on public.guardian_consents (step2_token_sha) where step2_token_sha is not null;

alter table public.guardian_consents enable row level security;
revoke all on public.guardian_consents from anon, authenticated;

-- ============================================================ consent_outbox
-- A queue, not a mail client. Nothing in the browser can see it and nothing
-- in this database sends anything: a worker holding the service role key
-- drains it. That keeps the provider credentials out of the app entirely
-- and makes the transport swappable — this started as an SMS queue and
-- became an email one without the consent logic changing at all.
--
-- The row holds a live token in the clear, because a message has to carry
-- one. That is why this table has RLS on, no policies, and no grants to
-- anon or authenticated: only the service role can read it.
create table if not exists public.consent_outbox (
  id          uuid primary key default gen_random_uuid(),
  consent_id  uuid not null references public.guardian_consents (id) on delete cascade,
  step        int not null check (step in (1, 2)),
  to_address    text not null,
  -- The live token, in the clear, because the worker has to put it in a
  -- message. The worker composes the link from its own configured origin
  -- and this value: the app never supplies the URL, so nothing the client
  -- sends can turn a consent email into a link somewhere else.
  token       text not null,
  subject     text not null,
  body        text not null,
  send_after  timestamptz not null default now(),
  sent_at     timestamptz,
  attempts    int not null default 0,
  last_error  text,
  created_at  timestamptz not null default now()
);

create index if not exists consent_outbox_due_idx
  on public.consent_outbox (send_after) where sent_at is null;

alter table public.consent_outbox enable row level security;
revoke all on public.consent_outbox from anon, authenticated;

-- ====================================================== the lock itself
-- Every disclosure surface in this app funnels through two columns on
-- users: discovery_enabled (search, "let others find me", the public
-- interest route, and by extension the feed, since entries_select joins
-- through it) and class_code (classmate visibility). Per-item sharing adds
-- entries.visibility / entries.shared_to_feed and photos.visibility.
--
-- So the lock is five triggers over those five fields, not a flag a screen
-- reads. A locked account cannot be made discoverable, cannot join a class,
-- and cannot mark anything public or shared — the write raises. Turning a
-- setting off by default would be a preference; this is a wall.

create or replace function public.reject_disclosure_when_locked()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_locked boolean;
  v_owner  uuid;
begin
  -- users rows carry the flag; everything else reaches it through user_id.
  if tg_table_name = 'users' then
    v_locked := new.disclosure_locked;
  else
    v_owner := new.user_id;
    select u.disclosure_locked into v_locked from public.users u where u.id = v_owner;
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

-- Numbered because Postgres fires same-timing triggers in alphabetical
-- order, and the order matters: users_01_protect_consent puts back a
-- disclosure_locked the client tried to change, and this one has to read
-- the restored value. Named the other way round, a client could clear the
-- flag in the same UPDATE that turns discovery on and walk straight
-- through the lock.
drop trigger if exists users_disclosure_lock on public.users;
drop trigger if exists users_02_disclosure_lock on public.users;
create trigger users_02_disclosure_lock
  before insert or update on public.users
  for each row execute function public.reject_disclosure_when_locked();

drop trigger if exists entries_disclosure_lock on public.entries;
create trigger entries_disclosure_lock
  before insert or update on public.entries
  for each row execute function public.reject_disclosure_when_locked();

drop trigger if exists photos_disclosure_lock on public.photos;
create trigger photos_disclosure_lock
  before insert or update on public.photos
  for each row execute function public.reject_disclosure_when_locked();

-- Belt and braces on the read side. The triggers above mean a locked
-- account should never have discovery_enabled true or a class_code in the
-- first place, so this changes nothing today — it is here so that a future
-- migration that sets those columns directly, bypassing the triggers,
-- still cannot make a locked account visible to a stranger.
-- ================================== the lock works in both directions
-- The triggers above stop a locked account being *found*. On their own they
-- leave the other half open: the account could still read the Community
-- feed, search for other students, and open a stranger's public hobby. That
-- is not what "locked out of every disclosure surface" means, and hiding
-- those tabs in the client would be a preference again rather than a wall.
--
-- So the viewer side is closed here too. For a locked account every
-- not-my-own branch of every visibility policy evaluates false, which
-- empties the feed, user search and the public interest route at the source
-- — a tampered client gets the same nothing a well-behaved one does.
--
-- Own rows are untouched in all four. The child's own garden is theirs to
-- read; it is other people this closes off, in both directions.
create or replace function public.viewer_is_disclosure_locked()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select u.disclosure_locked from public.users u where u.id = auth.uid()),
    false
  );
$$;

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
      and not exists (
        select 1 from public.blocks b
        where (b.user_id = auth.uid() and b.blocked_user_id = users.id)
           or (b.user_id = users.id and b.blocked_user_id = auth.uid())
      )
    )
  );

alter policy "interests_select" on public.interests
  using (
    user_id = auth.uid()
    or (
      not public.viewer_is_disclosure_locked()
      and interests.deleted_at is null
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
            and photos.visibility = 'public'
            and (
              u.discovery_enabled = true
              or (u.class_code is not null and u.class_code = public.my_class_code())
            )
          )
        )
    )
  );

-- ============================================= pending accounts cannot log
-- "No ability to log activity" is enforced where the writes happen, so it
-- holds for a client that has been tampered with as well as for ours.
-- re_consent_required is NOT included: turning 14 suspends sharing, not the
-- garden the child already has.
create or replace function public.consent_allows_writing()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select u.consent_state <> 'pending' from public.users u where u.id = auth.uid()),
    true
  );
$$;

alter policy "interests_insert_own" on public.interests
  with check (user_id = auth.uid() and public.consent_allows_writing());
alter policy "entries_insert_own" on public.entries
  with check (user_id = auth.uid() and public.consent_allows_writing());
alter policy "photos_insert_own" on public.photos
  with check (user_id = auth.uid() and public.consent_allows_writing());

-- ========================================== consent columns are not the client's
-- birthdate, consent_state and disclosure_locked decide what the account is
-- allowed to do, so the account itself must not be able to write them. The
-- functions below set a transaction-local flag; every other writer gets the
-- old values put back silently rather than an error, because an ordinary
-- profile save sends the whole row and should not fail for carrying columns
-- it never meant to change.
create or replace function public.protect_consent_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(current_setting('app.consent_write', true), '') = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- handle_new_user creates this row at signup and has no business
    -- setting any of these; a hand-rolled insert claiming 'active' has
    -- even less. Everyone starts ungated and unconsented, and only
    -- apply_age_gate moves them.
    new.birthdate         := null;
    new.consent_state     := 'not_required';
    new.disclosure_locked := false;
    return new;
  end if;

  new.birthdate         := old.birthdate;
  new.consent_state     := old.consent_state;
  new.disclosure_locked := old.disclosure_locked;
  return new;
end;
$$;

drop trigger if exists users_protect_consent on public.users;
drop trigger if exists users_01_protect_consent on public.users;
create trigger users_01_protect_consent
  before insert or update on public.users
  for each row execute function public.protect_consent_columns();

-- ================================================== the gate, at signup
-- Called once, right after the account is created. Decides which of the
-- three paths this signup is on:
--
--   14 or over, or an educator      nothing to do
--   under 14 with a valid class     the class is the consent route; the
--                                   school stands behind it, so the account
--                                   works immediately
--   under 14 with no class          guardian consent, twice, before the
--                                   account can log anything, and no
--                                   disclosure ever
create or replace function public.apply_age_gate(
  p_birthdate  date,
  p_class_code text default null
)
returns text
language plpgsql
security definer
set search_path = extensions, public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_is_org    boolean;
  v_under_14  boolean;
  v_has_class boolean;
  v_state     text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_birthdate is null then
    raise exception 'birthdate is required' using errcode = '22023';
  end if;
  if p_birthdate > current_date or p_birthdate < current_date - interval '120 years' then
    raise exception 'birthdate is not a real date' using errcode = '22023';
  end if;

  select u.account_type = 'org' into v_is_org from public.users u where u.id = v_uid;

  -- Once set, a birthdate is not something the account can revise: it is
  -- the input to a consent decision, and letting it move would let a child
  -- age themselves out of the gate.
  if exists (select 1 from public.users u where u.id = v_uid and u.birthdate is not null) then
    raise exception 'birthdate is already set for this account' using errcode = '22023';
  end if;

  v_under_14 := p_birthdate > (current_date - interval '14 years');

  v_has_class := p_class_code is not null
    and exists (select 1 from public.classes c where c.code = upper(trim(p_class_code)));

  if v_is_org or not v_under_14 or v_has_class then
    v_state := 'not_required';
  else
    v_state := 'pending';
  end if;

  perform set_config('app.consent_write', 'on', true);
  update public.users
  set birthdate = p_birthdate,
      consent_state = v_state,
      -- The lock only ever comes from a completed no-disclosure consent, so
      -- it is not set here. A pending account cannot write anything anyway.
      disclosure_locked = false,
      class_code = case when v_has_class then upper(trim(p_class_code)) else class_code end
  where id = v_uid;
  perform set_config('app.consent_write', 'off', true);

  return v_state;
end;
$$;

revoke all on function public.apply_age_gate(date, text) from public, anon;
grant execute on function public.apply_age_gate(date, text) to authenticated;

-- ======================================================= starting consent
-- Called by the pending child once they have a guardian's number. Queues
-- the first message; the worker sends it.
--
-- Re-calling this replaces the pending record rather than adding one. A
-- child who mistyped a digit, or whose guardian never got the text, has to
-- be able to start over — and the unique index only permits one live
-- record anyway.
create or replace function public.start_guardian_consent(
  p_contact         text,
  p_terms_version   text,
  p_privacy_version text
)
returns void
language plpgsql
security definer
set search_path = extensions, public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_state   text;
  v_contact text := lower(trim(coalesce(p_contact, '')));
  v_token   text;
  v_consent uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select consent_state into v_state from public.users where id = v_uid;
  if v_state is distinct from 'pending' then
    raise exception 'this account is not waiting on guardian consent' using errcode = '42501';
  end if;

  -- Deliberately shallow. The only check worth making here is that this
  -- could be an address at all; whether it reaches anybody is answered by
  -- nobody confirming, which is the same outcome as a typo and is
  -- recoverable by starting again with a corrected one.
  if v_contact !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'that does not look like an email address' using errcode = '22023';
  end if;
  if p_terms_version is null or p_privacy_version is null then
    raise exception 'policy versions are required' using errcode = '22023';
  end if;

  update public.guardian_consents
  set status = 'superseded'
  where user_id = v_uid and status = 'pending';

  v_token := encode(gen_random_bytes(32), 'hex');

  insert into public.guardian_consents (
    user_id, guardian_channel, guardian_contact,
    step1_token_sha, step1_sent_at,
    terms_version, privacy_version, status
  )
  values (
    v_uid, 'email', v_contact,
    encode(digest(v_token, 'sha256'), 'hex'), null,
    p_terms_version, p_privacy_version, 'pending'
  )
  returning id into v_consent;

  insert into public.consent_outbox (consent_id, step, to_address, token, subject, body)
  values (v_consent, 1, v_contact, v_token,
    'A child has asked for your permission to use Forest',
    'A child has asked to use Forest, and their account will not switch on until you agree.' || chr(10) || chr(10) ||
    'Forest keeps photos they take, voice notes they record, and writing in their journal. For this account, none of it is ever shared with other people, findable by search, or posted anywhere public. That is built into how the account works, not a setting someone can change later.' || chr(10) || chr(10) ||
    'Read the full details and agree here:');
end;
$$;

revoke all on function public.start_guardian_consent(text, text, text) from public, anon;
grant execute on function public.start_guardian_consent(text, text, text) to authenticated;

-- ===================================================== confirming a step
-- Called by the guardian, who is not signed in and never will be, so this
-- is granted to anon. The token is 256 bits of randomness, looked up by
-- SHA-256 rather than bcrypt: bcrypt exists to make low-entropy secrets
-- expensive to guess, and this is not one. What matters here is that the
-- stored form is not usable if the table leaks.
--
-- Returns a small json object rather than a boolean because the guardian's
-- page has to say something different at each stage, and telling a guardian
-- "invalid" when they are simply early is a support call nobody can take.
create or replace function public.confirm_guardian_consent(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = extensions, public, pg_temp
as $$
declare
  v_sha     text;
  v_rec     public.guardian_consents%rowtype;
  v_token2  text;
begin
  if p_token is null or length(p_token) < 32 then
    return jsonb_build_object('result', 'invalid');
  end if;

  v_sha := encode(digest(p_token, 'sha256'), 'hex');

  select * into v_rec from public.guardian_consents
  where step1_token_sha = v_sha or step2_token_sha = v_sha;

  if not found or v_rec.status not in ('pending', 'active') then
    return jsonb_build_object('result', 'invalid');
  end if;

  -- ---- step one
  if v_rec.step1_token_sha = v_sha then
    if v_rec.step1_confirmed_at is not null then
      return jsonb_build_object('result', 'already', 'step', 1);
    end if;

    v_token2 := encode(gen_random_bytes(32), 'hex');

    update public.guardian_consents
    set step1_confirmed_at = now(),
        -- The waiting period. The point of two confirmations is that the
        -- second one arrives when whoever tapped the first is no longer
        -- standing there, so this gap is the mechanism, not a formality.
        step2_not_before = now() + interval '24 hours',
        step2_token_sha = encode(digest(v_token2, 'sha256'), 'hex')
    where id = v_rec.id;

    insert into public.consent_outbox (consent_id, step, to_address, token, subject, body, send_after)
    values (v_rec.id, 2, v_rec.guardian_contact, v_token2,
      'One more check before the child can start',
      'Yesterday you agreed to let a child use Forest. This is the second and last check, and it is deliberate: asking twice, a day apart, is what makes this a considered decision rather than one tap.' || chr(10) || chr(10) ||
      'If you have changed your mind, do nothing and the account stays switched off.' || chr(10) || chr(10) ||
      'If you still agree, confirm here:',
      now() + interval '24 hours');

    return jsonb_build_object('result', 'ok', 'step', 1);
  end if;

  -- ---- step two
  if v_rec.step2_confirmed_at is not null then
    return jsonb_build_object('result', 'already', 'step', 2);
  end if;
  if v_rec.step2_not_before is not null and now() < v_rec.step2_not_before then
    return jsonb_build_object('result', 'too_soon', 'step', 2,
                              'not_before', v_rec.step2_not_before);
  end if;

  update public.guardian_consents
  set step2_confirmed_at = now(),
      status = 'active',
      activated_at = now()
  where id = v_rec.id;

  -- Both halves land together: the account starts working, and the lock
  -- that pays for the lighter consent standard goes on at the same moment.
  perform set_config('app.consent_write', 'on', true);
  update public.users
  set consent_state = 'active',
      disclosure_locked = true,
      discovery_enabled = false,
      default_visibility = 'private',
      -- Cleared for the same reason as the rest: classmates seeing each
      -- other is disclosure. A pending account should never have one, and
      -- if it somehow does, the lock trigger would raise and the guardian
      -- could never finish.
      class_code = null
  where id = v_rec.user_id;
  perform set_config('app.consent_write', 'off', true);

  return jsonb_build_object('result', 'ok', 'step', 2);
end;
$$;

revoke all on function public.confirm_guardian_consent(text) from public;
grant execute on function public.confirm_guardian_consent(text) to anon, authenticated;

-- =============================================== what the guardian is shown
-- A consent page has to say who and what before it asks for agreement, so
-- this is readable with the token alone. It returns the child's display
-- name and the policy versions and nothing else — no journal text, no
-- photos, no contact address back.
create or replace function public.describe_guardian_consent(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = extensions, public, pg_temp
as $$
declare
  v_sha text;
  v_rec public.guardian_consents%rowtype;
  v_name text;
begin
  if p_token is null or length(p_token) < 32 then
    return jsonb_build_object('result', 'invalid');
  end if;

  v_sha := encode(digest(p_token, 'sha256'), 'hex');

  select * into v_rec from public.guardian_consents
  where step1_token_sha = v_sha or step2_token_sha = v_sha;

  if not found or v_rec.status not in ('pending', 'active') then
    return jsonb_build_object('result', 'invalid');
  end if;

  select display_name into v_name from public.users where id = v_rec.user_id;

  return jsonb_build_object(
    'result', 'ok',
    'step', case when v_rec.step1_token_sha = v_sha then 1 else 2 end,
    'child_name', coalesce(v_name, ''),
    'terms_version', v_rec.terms_version,
    'privacy_version', v_rec.privacy_version,
    'step1_confirmed_at', v_rec.step1_confirmed_at,
    'step2_confirmed_at', v_rec.step2_confirmed_at,
    'step2_not_before', v_rec.step2_not_before
  );
end;
$$;

revoke all on function public.describe_guardian_consent(text) from public;
grant execute on function public.describe_guardian_consent(text) to anon, authenticated;

-- ================================================ what the child is shown
-- Deliberately does not return the guardian's address. The child typed it,
-- so they learn nothing from seeing it again, and a screen that prints a
-- parent's email prints it to whoever is holding the phone.
create or replace function public.my_consent_status()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_state text;
  v_locked boolean;
  v_rec public.guardian_consents%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('state', 'not_required');
  end if;

  select consent_state, disclosure_locked into v_state, v_locked
  from public.users where id = v_uid;

  select * into v_rec from public.guardian_consents
  where user_id = v_uid and status in ('pending', 'active')
  order by created_at desc limit 1;

  return jsonb_build_object(
    'state', coalesce(v_state, 'not_required'),
    'disclosure_locked', coalesce(v_locked, false),
    'has_request', found,
    'step1_confirmed_at', v_rec.step1_confirmed_at,
    'step2_confirmed_at', v_rec.step2_confirmed_at,
    'step2_not_before', v_rec.step2_not_before
  );
end;
$$;

revoke all on function public.my_consent_status() from public, anon;
grant execute on function public.my_consent_status() to authenticated;

-- ==================================================== turning fourteen
-- The class-code path lets an under-14 account behave like any other once
-- they turn 14, because the school's consent covered the account, not the
-- age. This path cannot do that. The guardian agreed to a specific thing:
-- an account that never discloses anything. Silently switching sharing on
-- because a birthday passed would be using their agreement for something
-- they were never asked about.
--
-- So the birthday does not unlock. It moves the account to
-- re_consent_required, which keeps the garden fully usable and keeps every
-- sharing surface shut until consent is taken again under the standard
-- 14-and-over flow. The old record is marked superseded rather than
-- deleted: the trail of what was agreed, and when it stopped applying, is
-- the whole point of keeping records at all.
create or replace function public.refresh_consent_state()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_bd    date;
  v_state text;
  v_kind  text;
begin
  if v_uid is null then
    return 'not_required';
  end if;

  select birthdate, consent_state into v_bd, v_state
  from public.users where id = v_uid;

  if v_state <> 'active' or v_bd is null then
    return coalesce(v_state, 'not_required');
  end if;

  if v_bd > (current_date - interval '14 years') then
    return v_state;  -- still under 14
  end if;

  select kind into v_kind from public.guardian_consents
  where user_id = v_uid and status = 'active'
  order by created_at desc limit 1;

  if v_kind is distinct from 'u14_internal_only' then
    return v_state;
  end if;

  update public.guardian_consents
  set status = 'superseded'
  where user_id = v_uid and status = 'active';

  perform set_config('app.consent_write', 'on', true);
  update public.users
  set consent_state = 're_consent_required'
      -- disclosure_locked deliberately stays true. It is what makes every
      -- sharing surface unavailable, and it must not come off until a new
      -- consent replaces the old one.
  where id = v_uid;
  perform set_config('app.consent_write', 'off', true);

  return 're_consent_required';
end;
$$;

revoke all on function public.refresh_consent_state() from public, anon;
grant execute on function public.refresh_consent_state() to authenticated;

notify pgrst, 'reload schema';
