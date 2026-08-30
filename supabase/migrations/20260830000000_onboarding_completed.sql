-- StoreContext used to infer "has this account finished onboarding" from
-- whether users.display_name was set. That broke once AuthFlow started
-- setting display_name at signup (to reserve the username early) instead of
-- only at the end of onboarding — every new signup looked "already
-- onboarded" and skipped straight past it. This is the real, explicit
-- signal instead.
alter table public.users
  add column if not exists onboarding_completed boolean not null default false;

-- Every row that already exists at migration time necessarily predates this
-- fix, so it was created back when signup alone (not onboarding finishing)
-- was enough to reach a usable account — treat all of them as already
-- onboarded. Only rows inserted after this point should ever start out
-- false. Safe to run more than once: on a rerun every existing row is
-- already true, so this is a no-op.
update public.users set onboarding_completed = true;
