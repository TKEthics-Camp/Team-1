-- Recovery checks: proves redeem_recovery_code resets passwords and moves a
-- student's login address only when it should (20261108000000). Paste into
-- the Supabase SQL editor and run, after applying that migration.
--
-- Same shape as privacy_checks.sql: it creates pretend accounts, redeems
-- codes as an anonymous visitor would, records each check as passed or
-- failed, and always ends by raising an error that carries the results —
-- which undoes everything, so nothing is left behind. The red box is the
-- report:
--   "RECOVERY CHECKS: 9 of 9 passed"   — all good

do $$
declare
  dom   constant text := '@users.forestapp.invalid';
  tag   text := substr(md5(random()::text), 1, 8);
  -- pretend accounts
  uS uuid := gen_random_uuid();  -- student renamed before renames moved the address
  uT uuid := gen_random_uuid();  -- student whose new address someone else already has
  uO uuid := gen_random_uuid();  -- that someone else
  uE uuid := gen_random_uuid();  -- educator, real email
  uW uuid := gen_random_uuid();  -- student, used for the wrong-code and bad-address checks
  uL uuid := gen_random_uuid();  -- student redeeming the old way, no address sent
  ok boolean;
  v text;
  results text[] := '{}';
  failed text[] := '{}';
begin
  -- ------------------------------------------------------------ set-up
  insert into auth.users (id, email, aud, role, raw_user_meta_data, encrypted_password)
  select u, e, 'authenticated', 'authenticated',
         jsonb_build_object('display_name', d), extensions.crypt('old-password', extensions.gen_salt('bf'))
  from (values
    (uS, 'rc-' || tag || '-old' || dom,      'rc_' || tag || '_new'),
    (uT, 'rc-' || tag || '-t-old' || dom,    'rc_' || tag || '_t_new'),
    (uO, 'rc-' || tag || '-taken' || dom,    'rc_' || tag || '_other'),
    (uE, 'rc-' || tag || '@school.example',  'rc_' || tag || '_teacher'),
    (uW, 'rc-' || tag || '-w' || dom,        'rc_' || tag || '_w'),
    (uL, 'rc-' || tag || '-l-old' || dom,    'rc_' || tag || '_l_new')
  ) as t(u, e, d);

  insert into public.recovery_codes (user_id, code_hash)
  select u, extensions.crypt('CODE' || k, extensions.gen_salt('bf'))
  from (values (uS, 'S'), (uT, 'T'), (uE, 'E'), (uW, 'W'), (uL, 'L')) as t(u, k);

  -- ------------------------------------------------------------ as a visitor
  -- Redeeming happens signed out, so every call below runs as anon.
  execute 'set local role anon';

  -- 1–2: the student renamed before the fix gets the right address, and the
  -- new password works with it.
  ok := public.redeem_recovery_code('rc_' || tag || '_new', 'CODES', 'brand-new-1',
                                    'rc_' || tag || '_new' || dom);
  execute 'reset role';
  select email into v from auth.users where id = uS;
  results := results || ('1 renamed student moved to the new address: ' || (ok and v = 'rc_' || tag || '_new' || dom));
  if not (ok and v = 'rc_' || tag || '_new' || dom) then failed := failed || '1'::text; end if;
  select (encrypted_password = extensions.crypt('brand-new-1', encrypted_password)) into ok from auth.users where id = uS;
  results := results || ('2 new password set: ' || ok);
  if not ok then failed := failed || '2'::text; end if;
  execute 'set local role anon';

  -- 3: an address someone else has stays theirs; the reset still happens.
  ok := public.redeem_recovery_code('rc_' || tag || '_t_new', 'CODET', 'brand-new-2',
                                    'rc-' || tag || '-taken' || dom);
  execute 'reset role';
  select email into v from auth.users where id = uT;
  results := results || ('3 taken address left alone, reset still done: ' || (ok and v = 'rc-' || tag || '-t-old' || dom));
  if not (ok and v = 'rc-' || tag || '-t-old' || dom) then failed := failed || '3'::text; end if;
  execute 'set local role anon';

  -- 4: an educator's real email is never replaced.
  ok := public.redeem_recovery_code('rc_' || tag || '_teacher', 'CODEE', 'brand-new-3',
                                    'rc_' || tag || '_teacher' || dom);
  execute 'reset role';
  select email into v from auth.users where id = uE;
  results := results || ('4 educator email untouched: ' || (ok and v = 'rc-' || tag || '@school.example'));
  if not (ok and v = 'rc-' || tag || '@school.example') then failed := failed || '4'::text; end if;
  execute 'set local role anon';

  -- 5: a wrong code changes nothing at all.
  ok := public.redeem_recovery_code('rc_' || tag || '_w', 'WRONG', 'brand-new-4',
                                    'rc_' || tag || '_moved' || dom);
  execute 'reset role';
  select email into v from auth.users where id = uW;
  results := results || ('5 wrong code: refused, address kept: ' || ((not ok) and v = 'rc-' || tag || '-w' || dom));
  if not ((not ok) and v = 'rc-' || tag || '-w' || dom) then failed := failed || '5'::text; end if;
  select (encrypted_password = extensions.crypt('old-password', encrypted_password)) into ok from auth.users where id = uW;
  results := results || ('6 wrong code: password kept: ' || ok);
  if not ok then failed := failed || '6'::text; end if;
  execute 'set local role anon';

  -- 7: an address off the app's own domain is refused.
  ok := public.redeem_recovery_code('rc_' || tag || '_w', 'CODEW', 'brand-new-5', 'someone@example.com');
  execute 'reset role';
  select email into v from auth.users where id = uW;
  results := results || ('7 foreign address refused: ' || (ok and v = 'rc-' || tag || '-w' || dom));
  if not (ok and v = 'rc-' || tag || '-w' || dom) then failed := failed || '7'::text; end if;

  -- 8: a malformed one on the right domain is refused too (the code above
  -- was used up, so a fresh one is set first, as the owner would).
  update public.recovery_codes set used_at = null, code_hash = extensions.crypt('CODEW2', extensions.gen_salt('bf'))
    where user_id = uW;
  execute 'set local role anon';
  ok := public.redeem_recovery_code('rc_' || tag || '_w', 'CODEW2', 'brand-new-6', 'two words' || dom);
  execute 'reset role';
  select email into v from auth.users where id = uW;
  results := results || ('8 malformed address refused: ' || (ok and v = 'rc-' || tag || '-w' || dom));
  if not (ok and v = 'rc-' || tag || '-w' || dom) then failed := failed || '8'::text; end if;
  execute 'set local role anon';

  -- 9: the old three-argument call still works, and moves nothing.
  ok := public.redeem_recovery_code('rc_' || tag || '_l_new', 'CODEL', 'brand-new-7');
  execute 'reset role';
  select email into v from auth.users where id = uL;
  results := results || ('9 old call still resets, address kept: ' || (ok and v = 'rc-' || tag || '-l-old' || dom));
  if not (ok and v = 'rc-' || tag || '-l-old' || dom) then failed := failed || '9'::text; end if;

  -- ------------------------------------------------------------ report
  -- Raised on purpose: an error undoes everything above. Every line is in
  -- the message itself, since the SQL editor doesn't always show the detail.
  raise exception E'RECOVERY CHECKS: % of % passed%\n%',
    array_length(results, 1) - coalesce(array_length(failed, 1), 0),
    array_length(results, 1),
    case when coalesce(array_length(failed, 1), 0) = 0 then ''
         else ' — FAILED: ' || array_to_string(failed, ', ') end,
    array_to_string(results, E'\n');
end
$$;
