-- Closes the hole that let any signed-in account read every class in the
-- system and then walk into whichever one it liked.
--
-- Three things combined to make that possible:
--
--   1. classes_select was `using (true)`, so `select * from classes`
--      returned every code ever minted. The original reasoning was that a
--      class code is meant to be handed out, so there's nothing secret in
--      a row — but that only holds if you have to *be handed* one. Being
--      able to list them all is not the same as being told one.
--   2. joinClass() wrote users.class_code directly, and users_update_self
--      allows updating any column of your own row. The "does this code
--      exist" check lived in the client, where it decides nothing.
--   3. users_select hands you every profile sharing your class_code.
--
-- So: read the table, pick any code, write it to your own row, and read
-- off the whole roster — names, avatars, bios — of a class you were never
-- in. For an app used by children that is the worst thing in here.
--
-- The fix moves the membership write server-side, where the code can
-- actually be checked, and stops the table being enumerable at all.

-- ============================================================== classes
-- An educator still reads their own row (fetchMyClassCode). Nobody reads
-- anyone else's — validating a typed code is join_class()'s job now, and
-- it runs as definer precisely so it can check a row the caller can't see.
drop policy if exists "classes_select" on public.classes;
create policy "classes_select_own" on public.classes
  for select using (owner_id = auth.uid());

-- ========================================================== membership
-- The only supported way to change users.class_code. Definer so it can
-- see the classes table the caller can't, and so the existence check and
-- the write happen in one statement pair the client can't come between.
--
-- Returns false for a code that doesn't exist, rather than raising, since
-- "you typed it wrong" is an ordinary outcome the sheet renders inline.
create or replace function public.join_class(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not exists (select 1 from public.classes where code = p_code) then
    return false;
  end if;

  -- Transaction-local, and read by the guard trigger below: this is the
  -- one path allowed to move class_code.
  perform set_config('app.class_join', 'on', true);
  update public.users set class_code = p_code where id = auth.uid();
  perform set_config('app.class_join', 'off', true);

  return true;
end;
$$;

revoke all on function public.join_class(text) from public, anon;
grant execute on function public.join_class(text) to authenticated;

-- ====================================================== column guards
-- users_update_self has to stay broad — it's how every ordinary profile
-- edit works — so the columns that must not be self-assigned are frozen
-- here instead of by narrowing the policy.
--
--   class_code    only join_class() may move it (see the flag above).
--   account_type  decides whether the app renders the educator dashboard.
--                 It's set once at signup from the signUp metadata (see
--                 handle_new_user below) and never again; leaving it
--                 writable let any student hand themselves the teacher's
--                 side of the app.
create or replace function public.guard_user_privileged_columns()
returns trigger
language plpgsql
as $$
begin
  if new.account_type is distinct from old.account_type then
    raise exception 'account_type is set at signup and cannot be changed'
      using errcode = '42501';
  end if;

  if new.class_code is distinct from old.class_code
     and coalesce(current_setting('app.class_join', true), '') <> 'on' then
    raise exception 'class_code can only be changed through join_class()'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists users_guard_privileged_columns on public.users;
create trigger users_guard_privileged_columns
  before update on public.users
  for each row execute function public.guard_user_privileged_columns();

-- ===================================================== signup plumbing
-- AuthFlow used to set account_type in its post-signup UPDATE, which the
-- guard above now refuses. The value is already in the signup metadata
-- (AuthContext.signUp passes { username, accountType }), so read it here
-- and set it at insert time, before the guard applies.
--
-- display_name deliberately stays empty: AuthFlow's UPDATE is what
-- surfaces a taken username as a 23505 it can show inline, and moving that
-- into this trigger would turn it into an opaque signup failure instead.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    case when new.raw_user_meta_data ->> 'accountType' = 'org' then 'org' else 'individual' end
  );
  return new;
end;
$$;
