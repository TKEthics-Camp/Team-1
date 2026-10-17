-- Tells the Supabase CLI which migrations are already applied (PRD §14.13).
--
-- Every migration in supabase/migrations/ was applied by hand in the SQL
-- editor, so the CLI's own record of them — supabase_migrations.schema_migrations
-- — is empty, and `supabase db push` would try to apply all of them again
-- from the start. This fills that record in, without running anything.
--
-- Run it ONCE, in the SQL editor, after the newest migrations below are in.
-- From then on, apply new migrations with `supabase db push` (see
-- supabase/README.md) and the record keeps itself up to date.
--
-- Safe to run twice: rows already recorded are left alone.

create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version    text primary key,
  statements text[],
  name       text
);

insert into supabase_migrations.schema_migrations (version, name) values
  ('20260723000000', 'multi_user_schema'),
  ('20260723000001', 'grant_table_privileges'),
  ('20260724000000', 'unique_display_name'),
  ('20260725000000', 'interest_appearance_columns'),
  ('20260824000000', 'classes'),
  ('20260824000001', 'fix_users_select_recursion'),
  ('20260825000000', 'tree_visibility_from_discoverable'),
  ('20260828000000', 'photo_storage'),
  ('20260830000000', 'onboarding_completed'),
  ('20260830010000', 'photo_storage_update_policy'),
  ('20260831000000', 'user_coins'),
  ('20260831010000', 'daily_goal'),
  ('20260901000000', 'feed_posts'),
  ('20260902000000', 'photo_storage_select_fix'),
  ('20260907000000', 'trash_tombstone'),
  ('20260908000000', 'sync_sound_setting'),
  ('20260908010000', 'drop_dead_interest_columns'),
  ('20260908020000', 'drop_daily_goal'),
  ('20260908030000', 'sync_owned_items'),
  ('20260908040000', 'sync_lang_and_theme'),
  ('20260908050000', 'sync_voice_notes'),
  ('20260912000000', 'lock_class_membership'),
  ('20260912010000', 'account_deletion'),
  ('20260912020000', 'watches_rebuilt'),
  ('20260912030000', 'account_recovery'),
  ('20260917000000', 'account_deletion_resilient'),
  ('20260917010000', 'recovery_code_requires_password'),
  ('20260918000000', 'age_gate_guardian_consent'),
  ('20260920000000', 'content_filter'),
  ('20260920010000', 'moderation_queue'),
  ('20260920020000', 'hide_what_i_reported'),
  ('20260926000000', 'class_code_paths'),
  ('20260926010000', 'consent_outbox_claim'),
  ('20260926020000', 'guardian_withdrawal'),
  ('20261010000000', 'fix_entry_photo_ownership'),
  ('20261011000000', 'age_required'),
  ('20261011010000', 'moderator_media'),
  ('20261017000000', 'storage_sweeps'),
  ('20261017010000', 'newest_edit_wins'),
  ('20261017020000', 'drop_users_bio')
on conflict (version) do nothing;

select count(*) as recorded from supabase_migrations.schema_migrations;
