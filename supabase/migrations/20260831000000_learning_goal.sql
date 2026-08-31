-- One line the user writes during onboarding about what they're working
-- towards. Nullable and defaulted to '' because the step is skippable —
-- an empty answer is a real answer, not a missing one.
alter table public.users
  add column if not exists learning_goal text not null default '';
