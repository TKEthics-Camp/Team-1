-- The daily practice goal was asked for during onboarding and synced
-- perfectly, but nothing in the app ever read it back — no progress bar,
-- no comparison against real logged minutes, nothing. A goal that's
-- collected and stored but never measured against isn't a feature, so the
-- onboarding step is gone and this column goes with it.
alter table public.users drop column if exists daily_goal;
