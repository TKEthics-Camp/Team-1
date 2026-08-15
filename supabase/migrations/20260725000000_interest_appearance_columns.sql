-- Columns the client always had locally but sync silently dropped: reminder
-- weekdays, the user-chosen species/leaf colour, and the revival timestamp.
-- Without these, a tree adopted on a second device (or restored after a
-- sign-out cache wipe) changed appearance and reverted to daily reminders.
-- src/lib/remote.js falls back to the old column set if this isn't applied.
alter table public.interests
  add column if not exists days integer[] not null default '{}',
  add column if not exists species text,
  add column if not exists leaf_color text,
  add column if not exists revived_at timestamptz;
