-- Prevent two accounts from sharing a username (case-insensitive: "Alex" and
-- "alex" collide, matching how searchUsers already treats them as the same
-- identity via ilike). Empty string is excluded because every account starts
-- there before onboarding fills in a real display name — without this
-- exclusion, the second-ever signup would already collide on ''.
create unique index users_display_name_unique_idx
  on public.users (lower(display_name))
  where display_name <> '';
