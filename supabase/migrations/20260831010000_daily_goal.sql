-- Supersedes 20260831000000_learning_goal.sql. That migration was never
-- applied to the project (its column was verified absent), and the free-text
-- goal it backed has been replaced by a four-rung daily practice goal, so the
-- text column is dropped rather than left behind unused. Both statements are
-- conditional, so this is safe whether or not the earlier one ever ran.
alter table public.users
  add column if not exists daily_goal integer not null default 20;

alter table public.users
  drop column if exists learning_goal;
