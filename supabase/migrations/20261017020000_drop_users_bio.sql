-- users.bio has been read by nothing since the first schema (PRD §14.15).
-- A column nobody uses misleads whoever reads the schema next, the way
-- interests.visibility did before it was dropped. Checked before removing:
-- no app code, no database function and no policy refers to it.
alter table public.users drop column if exists bio;

notify pgrst, 'reload schema';
