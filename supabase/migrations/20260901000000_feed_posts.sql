-- Explore's Community feed, from real accounts.
--
-- Sharing to the feed is deliberately a *second*, opt-in flag rather than a
-- third value on `visibility`. The two answer different questions: visibility
-- decides whether someone who opens your profile can read an entry, and this
-- decides whether it also goes out to the feed. Keeping them apart means a
-- public entry stays quietly on your profile unless you actually chose to
-- broadcast it — the default for everything already logged.
alter table public.entries
  add column if not exists shared_to_feed boolean not null default false;

-- The feed reads newest-first over the small subset that opted in, so the
-- index is partial — it only carries shared rows, not every entry ever.
create index if not exists entries_feed_idx
  on public.entries (created_at desc)
  where shared_to_feed;

-- No new SELECT policy: entries_select already requires the entry AND its
-- parent interest to be public before anyone else can read it, which is
-- exactly the gate a feed post should pass. This column only narrows what
-- the client asks for; it never widens what RLS allows.
