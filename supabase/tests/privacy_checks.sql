-- Privacy checks: proves the database itself enforces who can see and do
-- what (PRD §9.2, §13.5, §14.11). Paste into the Supabase SQL editor and run.
--
-- WHAT IT DOES
-- Inside one statement it creates a handful of pretend accounts and
-- records, then signs in as each one in turn and tries things that must be
-- refused: reading a private entry, seeing someone who blocked you, a
-- locked account making itself findable, rewriting your own consent
-- state, and so on. Every check is recorded as passed or failed.
--
-- NOTHING IS KEPT
-- The statement always ends by raising an error that carries the results.
-- An error undoes the whole statement, so every pretend account and record
-- disappears with it — nothing is left in the database, ever. The red error
-- box is the report, not a problem:
--   "PRIVACY CHECKS: 14 of 14 passed"   — all good
--   "PRIVACY CHECKS: 12 of 14 passed — FAILED: ..." — something to fix
--
-- Run it again after any migration that touches a policy or trigger.

do $$
declare
  -- pretend accounts
  uA uuid := gen_random_uuid();  -- owner, findable, has public and private entries
  uB uuid := gen_random_uuid();  -- an ordinary other student
  uC uuid := gen_random_uuid();  -- under a no-sharing guardian consent (locked)
  uD uuid := gen_random_uuid();  -- blocked by A
  uE uuid := gen_random_uuid();  -- owner who is NOT findable
  uF uuid := gen_random_uuid();  -- another ordinary student
  uP uuid := gen_random_uuid();  -- waiting on a guardian (pending)
  tag text := substr(md5(random()::text), 1, 8);
  n int;
  v text;
  refused boolean;
  results text[] := '{}';
  failed text[] := '{}';
begin
  -- ------------------------------------------------------------ set-up
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  select u, 'privacy-check-' || tag || '-' || k || '@users.forestapp.invalid',
         'authenticated', 'authenticated',
         jsonb_build_object('display_name', 'zz_check_' || tag || '_' || k)
  from (values (uA, 'a'), (uB, 'b'), (uC, 'c'), (uD, 'd'), (uE, 'e'), (uF, 'f'), (uP, 'p')) as t(u, k);

  -- Consent states, set the way the consent functions set them.
  perform set_config('app.consent_write', 'on', true);
  update public.users set consent_state = 'not_required', disclosure_locked = false
    where id in (uA, uB, uD, uE, uF);
  update public.users set consent_state = 'active', disclosure_locked = true where id = uC;
  update public.users set consent_state = 'pending', disclosure_locked = false where id = uP;
  perform set_config('app.consent_write', 'off', true);
  update public.users set discovery_enabled = true where id = uA;

  insert into public.interests (id, user_id, name) values
    ('chk_' || tag || '_iA', uA, 'Piano'),
    ('chk_' || tag || '_iE', uE, 'Chess'),
    ('chk_' || tag || '_iP', uP, 'Drawing');
  insert into public.entries (id, interest_id, date, text, visibility, updated_at) values
    ('chk_' || tag || '_pub',  'chk_' || tag || '_iA', '2026-10-01', 'scales', 'public',  '2026-10-10'),
    ('chk_' || tag || '_priv', 'chk_' || tag || '_iA', '2026-10-02', 'secret', 'private', '2026-10-10'),
    ('chk_' || tag || '_epub', 'chk_' || tag || '_iE', '2026-10-03', 'opening', 'public', '2026-10-10');
  insert into public.blocks (user_id, blocked_user_id) values (uA, uD);

  -- ------------------------------------------------------------ as B
  perform set_config('request.jwt.claims', json_build_object('sub', uB, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uB::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.entries where id = 'chk_' || tag || '_priv';
  results := results || ('1 private entry hidden from others: ' || (n = 0));
  if n <> 0 then failed := failed || '1'::text; end if;

  select count(*) into n from public.entries where id = 'chk_' || tag || '_pub';
  results := results || ('2 public entry of a findable student visible: ' || (n = 1));
  if n <> 1 then failed := failed || '2'::text; end if;

  select count(*) into n from public.entries where id = 'chk_' || tag || '_epub';
  results := results || ('3 public entry of a non-findable student hidden: ' || (n = 0));
  if n <> 0 then failed := failed || '3'::text; end if;

  -- B tries to rewrite their own consent state: silently restored.
  update public.users set consent_state = 'active', disclosure_locked = true where id = uB;
  select consent_state into v from public.users where id = uB;
  results := results || ('4 own consent state cannot be rewritten: ' || (v = 'not_required'));
  if v <> 'not_required' then failed := failed || '4'::text; end if;

  -- B tries to make themselves an educator: refused.
  refused := false;
  begin
    update public.users set account_type = 'org' where id = uB;
  exception when others then refused := true;
  end;
  results := results || ('5 cannot turn yourself into an educator: ' || refused);
  if not refused then failed := failed || '5'::text; end if;

  -- B tries to write a class code directly: refused.
  refused := false;
  begin
    update public.users set class_code = 'ANYCODE' where id = uB;
  exception when others then refused := true;
  end;
  results := results || ('6 cannot write a class code directly: ' || refused);
  if not refused then failed := failed || '6'::text; end if;

  -- B reports A's public entry: gone for B.
  insert into public.reports (id, reporter_id, target_type, target_id, reason)
    values ('chk_' || tag || '_r', uB, 'entry', 'chk_' || tag || '_pub', 'mean');
  select count(*) into n from public.entries where id = 'chk_' || tag || '_pub';
  results := results || ('7 what you report disappears for you: ' || (n = 0));
  if n <> 0 then failed := failed || '7'::text; end if;

  -- B is not a moderator.
  results := results || ('8 non-moderator cannot open reported files: ' ||
    (not public.moderator_can_read('photos', uA::text || '/x.jpg')));
  if public.moderator_can_read('photos', uA::text || '/x.jpg') then failed := failed || '8'::text; end if;

  -- ------------------------------------------------------------ as F
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', uF, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uF::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.entries where id = 'chk_' || tag || '_pub';
  results := results || ('9 one report does not hide it from everyone: ' || (n = 1));
  if n <> 1 then failed := failed || '9'::text; end if;

  -- ------------------------------------------------------------ as D
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', uD, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uD::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.entries where id = 'chk_' || tag || '_pub';
  select n + count(*) into n from public.users where id = uA;
  results := results || ('10 a blocked student sees nothing of the blocker: ' || (n = 0));
  if n <> 0 then failed := failed || '10'::text; end if;

  -- ------------------------------------------------------------ as C (locked)
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', uC, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uC::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.entries where id = 'chk_' || tag || '_pub';
  select n + count(*) into n from public.users where id = uA;
  results := results || ('11 a no-sharing account sees no one else: ' || (n = 0));
  if n <> 0 then failed := failed || '11'::text; end if;

  refused := false;
  begin
    update public.users set discovery_enabled = true where id = uC;
  exception when others then refused := true;
  end;
  results := results || ('12 a no-sharing account cannot make itself findable: ' || refused);
  if not refused then failed := failed || '12'::text; end if;

  -- ------------------------------------------------------------ as P (pending)
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', uP, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uP::text, true);
  execute 'set local role authenticated';

  refused := false;
  begin
    insert into public.entries (id, interest_id, date, text)
      values ('chk_' || tag || '_pe', 'chk_' || tag || '_iP', '2026-10-05', 'hi');
  exception when others then refused := true;
  end;
  results := results || ('13 an account waiting on a guardian cannot log anything: ' || refused);
  if not refused then failed := failed || '13'::text; end if;

  -- ------------------------------------------------------------ as A (owner)
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', uA, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uA::text, true);
  execute 'set local role authenticated';

  -- An edit stamped older than the saved one is refused (20261017010000).
  update public.entries set text = 'stale', updated_at = '2026-09-01'
    where id = 'chk_' || tag || '_priv';
  select text into v from public.entries where id = 'chk_' || tag || '_priv';
  results := results || ('14 an older edit cannot overwrite a newer one: ' || (v = 'secret'));
  if v is distinct from 'secret' then failed := failed || '14'::text; end if;

  execute 'reset role';

  -- ------------------------------------------------------------ report
  -- Raised on purpose: an error undoes everything above.
  -- Every line is in the message itself, since the SQL editor shows the
  -- message and not always the detail.
  raise exception E'PRIVACY CHECKS: % of % passed%\n%',
    array_length(results, 1) - coalesce(array_length(failed, 1), 0),
    array_length(results, 1),
    case when coalesce(array_length(failed, 1), 0) = 0 then ''
         else ' — FAILED: ' || array_to_string(failed, ', ') end,
    array_to_string(results, E'\n');
end
$$;
