# Audit of necessary database improvements

FOREST — BACKEND WIRING AUDIT

Engineering reference, updated after the security pass

What's real, what's still fixture data, and what it actually takes to finish
every feature that's been blocked on Supabase.

9 tables · 24 migrations written · RLS on every table
⚠ 4 migrations are written but NOT yet applied — see "Unapplied work" below.
The live database is currently at 8 tables: watches is one of the four.

---

THE SHORT VERSION

This section's original backlog is now finished. Photo storage — called out
last time as the biggest single lift — is done, along with the community
feed, coin/purchase sync, report and block across all four target types,
follow-a-hobby, and start-a-hobby from a real person's page.

What replaced them is a different category of work. A security pass over the
schema found that class codes were enumerable by any signed-in account, that
account_type was self-assignable, and that there was no way to delete an
account at all. Those are fixed in code but not yet in the database.

And one gap nobody had written down, which is now the only open item in this
document: reports can be filed from four places, and nobody can read any of
them.

A warning about how this section is maintained. The previous revision listed
the watches table as existing. It had been dropped four days earlier. That
was not carelessness — it was written by reading the schema migration, where
the CREATE TABLE is still plainly there, and missing the later DROP. Check
claims about the live database against the live database.

---

ALREADY DONE (since the last revision)

✓ Photo sync (Storage)
Was "BIGGEST LIFT — the one true infrastructure gap left." Now done. Private
'photos' bucket, uid-prefixed paths, upload wired into addPhoto, lazy
download anywhere a photo is displayed remotely, and downscaling before
upload. Photos now show on other people's trees.
Landed across 20260828000000, 20260902000000, 20260830010000.

✓ Community posts
Was "NEW SCHEMA — no posts table anywhere." Done, but worth knowing how: it
was NOT built as a separate posts table. A post is an existing journal entry
flagged shared_to_feed, with an index to query them. That keeps the PRD's
constraints for free — anonymous by default, finite feed, no comments — and
means a post can never drift from the entry it came from. pullFeed() in
remote.js queries it; CommunityTab renders real data.
Landed in 20260901000000_feed_posts.sql.

✓ Account sync (coins & purchases)
Was "LIGHT SCHEMA." Done. Coins, owned hair, owned outfits, equipped
decoration, language, theme and sound all sync now.
Landed across 20260831000000, 20260908030000, 20260908040000.

✓ Voice notes
Not in the last revision at all. Private 'voice-notes' bucket with the same
uid-prefixed policy shape as photos.
Landed in 20260908050000.

---

THE GAP INVENTORY

1. Moderation queue — BLOCKER
The reports table has been collecting rows with no way to read them. There's
no select policy for anyone but the reporter, and no admin tooling anywhere
in the repo. A child can report something and nothing happens, and no adult
can see that it happened. This is the most serious open item in this
document and it is not a feature request.
Needs: a service-role-backed view (reports are deliberately unreadable via
RLS, which is correct — the queue must live outside the client app).

2. Report & block — DONE
Was partial: wired only on community feed posts, so only 'entry' was ever
sent even though reports.target_type accepts interest, photo, entry and
user. All four are now reachable from where the thing is actually looked at
— a user's profile, a public tree, a photo in the viewer, and an individual
journal entry. One shared ReportMenu component rather than four copies.
Blocking still hides content automatically through existing RLS; the button
was genuinely all that was missing.

3. Follow a hobby — DONE, pending migration
Correcting the previous revision, which listed this as "READY — table + RLS
exist." They did not. watches was DROPPED in 20260908010000, precisely
because it had sat unused since the first migration and its insert policy
was blocking the interests.visibility drop in that same file. Reading the
schema migration alone gets this wrong; the table has to be checked against
the live database, which is how it was actually caught (PostgREST returning
PGRST205 "could not find the table").
Now rebuilt in 20260912020000 with the feature attached: a watch button on
PublicInterestScreen and a list in the Me tab. Still points at an interest
and never at a user (PRD §9). The old policy's interests.visibility = 'public'
check is gone with the column — the check is now just "the interest exists",
which RLS filters through interests_select for free.

4. Start a hobby from a real person's page — DONE
PublicInterestScreen now has the same one-liner the other four already used.
It reads "Log yours" instead when you already have a tree with that name —
starting a hobby from someone else's tree makes your own separate tree, it
never joins theirs.

---

UNAPPLIED WORK — READ BEFORE THE NEXT PUSH

Four migrations are committed but have not been run against the project.
Until `supabase db push` runs, the app in the repo and the live database
disagree, and two of these are load-bearing for signup.

20260912000000_lock_class_membership.sql
  Any signed-in account could read the entire classes table, write any code
  it found into its own users.class_code, and then read off that class's
  full roster — names, avatars, bios — for a class it was never in. The
  existence check lived in the client, where it decides nothing.
  Fix: classes is owner-readable only; membership moves through a
  join_class() definer function; a trigger freezes class_code and
  account_type against direct writes.
  ⚠ Ships with a matching AuthFlow change. account_type is now set at
  signup from auth metadata, so this migration and that code must go
  together or new signups break.

20260912010000_account_deletion.sql
  There was no account deletion of any kind. delete_my_account() clears both
  storage buckets by uid-prefixed path, then deletes the auth row, which
  cascades everything else.

20260912020000_watches_rebuilt.sql
  Recreates the watches table dropped in 20260908010000, now that there is a
  feature behind it. Until this runs, the watch button fails closed — the
  optimistic toggle reverts and says so, which is correct but useless.

20260830010000_photo_storage_update_policy.sql
  A renumber, not new work. It previously shared version 20260830000000 with
  the onboarding_completed migration — Supabase keys applied migrations by
  version, so only one of the two was ever recorded and the order between
  them was undefined. Rewritten as drop-then-create so it is safe to re-run
  on a database that already has the policy under the old numbering.

---

ALREADY REAL — DON'T REDO IT

User search (Explore) is fully live and has been for some time. searchUsers()
queries the real users table, respects the discoverable flag, and is gated by
RLS. It falls back to fixture data only in local debug mode.

Classes and the school roster are real. Every educator gets their own
generated code; the educator dashboard and the student School tab both query
live data.

The STUDENTS fixture in lib/community.js is still used — but only by
StudentSheet, for the demo classmate cards. Don't read its presence as
evidence the roster is fake; it isn't.

---

WHAT'S LEFT, AS TRACKS

Track 1 — Moderation (do this first)
  • A place to read and action reports
Everything else in this document is a feature. This one is a duty of care,
and it is now the only open item here at all — reports can be filed from
four different places, and nobody can read any of them.

---

THE RECIPE MOST OF THESE SHARE

Report, block and follow all reduce to the same four moves.

1. Confirm or write the RLS policy
   reports, blocks and watches all already have theirs, in
   20260723000000_multi_user_schema.sql. Check before writing.

2. Add a function in lib/remote.js
   Follow an existing shape — pullMine, pullPublicProfile, searchUsers,
   fetchClassmates, pullFeed. Same error handling, same return shape.

3. Replace the fixture import with a real fetch
   useState + useEffect calling the new function, the way
   PublicInterestScreen.jsx, SchoolTab.jsx and CommunityTab.jsx already do.

4. Handle loading and empty states
   A fixture array is never empty and never slow. Real data is both.

For anything that writes a column the user shouldn't control themselves,
there is now a fifth move: check it against the guard trigger in
20260912000000. users_update_self is deliberately broad, so the columns that
must not be self-assigned are frozen at the table instead of the policy.

---

ONE PROCESS NOTE

The previous revision noted that features kept needing a follow-up fix after
landing, usually because nothing was clicked through against the live app
before being called done. That still holds, and this revision is itself an
example: three of the items it removes were listed as open here while
already being finished in code, and two of the items it adds were never
written down at all.

Two habits, both cheap:
  • Merge develop into your branch before starting, not just at the end.
  • Click the feature in the running app against real Supabase before
    calling it done. The test suite added alongside this pass covers
    streaks, tree growth and death, date handling and the derived signup
    address — it will not tell you a screen is wired to the wrong query.

Built from a direct read of supabase/migrations/ and src/ — not a summary of
what anyone reported.
