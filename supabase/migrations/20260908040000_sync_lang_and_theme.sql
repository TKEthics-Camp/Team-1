-- Both were local-only and silently reset to their defaults (English,
-- and whichever theme DEFAULT_THEME is) after any sign-out, regardless of
-- what the user had actually chosen.
alter table public.users add column if not exists lang text;
alter table public.users add column if not exists theme text;
