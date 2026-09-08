-- soundOn only ever lived in local storage, never synced — a sign-out
-- wipes local storage entirely, and the profile rebuilt on the next
-- sign-in had no remote value to recover it from, so it silently reset to
-- on (the app's default) every time, regardless of what was chosen before.
alter table public.users add column if not exists sound_on boolean not null default true;
