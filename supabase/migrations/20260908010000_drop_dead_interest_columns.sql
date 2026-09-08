-- Five columns on interests with no live feature behind them anymore:
--   time         - the per-hobby reminder time; reminders are day-of-week
--                  only now (see the "Remind by day only" change).
--   visibility   - superseded by the account-level discoverable/class-code
--                  model (see 20260825000000_tree_visibility_from_discoverable.sql,
--                  which already stopped any policy from reading it).
--   friends      - always an empty array; there's no UI anywhere that ever
--                  sets it to anything else.
--   category     - never read or written by any feature; looks like
--                  scaffolding for something that was never built.
--   inspired_by  - same as category, for an "inspired by a friend's post"
--                  feature that never got built.
-- The client (src/lib/remote.js) has stopped sending or reading any of
-- these — dropping them here just catches the database up.
alter table public.interests
  drop column if exists time,
  drop column if exists visibility,
  drop column if exists friends,
  drop column if exists category,
  drop column if exists inspired_by;
