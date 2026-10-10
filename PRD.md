PRODUCT REQUIREMENTS DOCUMENT — FOREST (森林)

A hobby tracker for secondary-school students. Each interest is a tree that
grows when the student logs real activity against it and dies if they stop.

Revised 2026-10-11. Supersedes the 2026-09-12 revision.
Section numbers are cited from code comments and migrations (PRD §7, PRD §9,
PRD §14.1, PRD §14.2 all appear in src/ and supabase/migrations/). Renumber
only with a matching pass over those references.

Every figure in this document was read out of the code on 2026-10-11.
Where a number appears, the constant it came from is named.

"Forest" is a working name. "Forest: Focus for Productivity" is an existing
App Store app that also grows trees, so the product needs a new name before
it ships (§14.12).


--------------------------------------------------------------------------
1. VISION
--------------------------------------------------------------------------

The student opens the app and sees a garden. Each tree is one interest —
Piano, Basketball, Watercolours. A tree grows only when the student logs
that they did the thing: a journal entry with a duration, a photo, a voice
note, or a combination. A tree that goes untended wilts and eventually
dies. A dead tree can be revived for coins, which the student earns only by
logging activity.

The garden is private by default. It becomes visible to others through
exactly two paths, both account-level: the student turns on "let others
find me," or the viewer shares their class code. There is no per-tree
privacy setting; that was removed in 20260825000000 because two controls
for one idea were routinely set inconsistently. Some accounts can never be
seen at all: those set up under a guardian's no-sharing consent (§3.4).

Alongside the garden is Explore: curated hobby ideas, classmates who share
interests, and a small feed of journal entries their authors chose to
share. It is a finder, not a feed — finite, no comments, no infinite
scroll.

The product competes for attention that would otherwise go to games and
short video. It uses the same mechanics those use — streaks, unlocks, a
small pending reward — pointed at activity that happened away from the
phone.

It ships as a website and as an iPhone app, with the US App Store as the
first store target.


--------------------------------------------------------------------------
2. PROBLEM
--------------------------------------------------------------------------

2.1 Motivation decays faster than interest does. A student takes up a
hobby, sustains it for roughly two weeks, then loses it to homework, a slow
week, or the absence of anyone else doing it. Nothing in their day
afterwards references either the hobby or the progress they made.

2.2 Rural students have a thinner support structure for sustaining one.
Fewer specialist teachers, fewer peers with the same interest, less money
for lessons or equipment, and longer unstructured hours that default to a
phone. The distance between wanting to continue and continuing is larger
than for a well-resourced student.

2.3 The design premise. Low-effort entertainment wins by being frictionless
and immediately rewarding, not by being more appealing in principle. If
logging real activity is made equally frictionless, and seeing it accumulate
equally immediate, it can compete for the same idle minutes. This premise
is untested with real students (see §13, §14).


--------------------------------------------------------------------------
3. USERS AND ACCOUNT TYPES
--------------------------------------------------------------------------

Two account types. They are not symmetric — they share a shell and diverge
at the first screen after auth.

3.1 Individual (student)

  Secondary-school students, roughly 13-18, and younger students where a
  guardian or school has agreed (§3.4). Originally scoped to rural Jiangxi;
  nothing in the build depends on that context.

  Signs up with username, password and date of birth. No email is
  collected, because a meaningful share of the target users do not have
  one. Supabase Auth requires an address, so one is derived from the
  username (§7.7). Because there is no email, a forgotten password is
  recovered with a recovery code the student creates in advance (§6.6).

  Lands on Home, which is their garden — unless their age means they are
  waiting on a guardian (§3.4).

  Gets: garden, trees, journal, album, voice notes, coins, market, avatar,
  Explore with all three tabs, badges, year in review, memories, recently
  deleted, watching list, data export.

3.2 Org (educator)

  A teacher or school. Signs up with a real email, since only educators
  need a reachable address. Not asked for a birthdate: the account type
  is for adults.

  Lands on Home, which is a dashboard, not a garden. Has no trees, cannot
  plant one, and the "start this hobby" affordances are hidden throughout.

  Gets: class code with copy button, student count, total hobby count,
  live roster, read-only student sheets.

  Onboarding is three steps rather than seven (§6.8).

3.3 The link between them

  An educator's class code is minted automatically at the end of their
  onboarding by mintOrFetchClassCode, which generates a random code,
  inserts it into classes, and retries on collision up to five times.

  A student joins from Me → Join a class by typing the code, at signup on
  the birthday step, or from the waiting-for-a-grown-up screen. The join is
  validated server-side (join_class(), or apply_age_gate /
  join_class_from_pending), security-definer functions that check the code
  exists and write users.class_code in the same call.

  Once class_code matches, users_select's third branch makes the two
  accounts mutually visible, and interests_select's class branch makes
  their trees visible to each other without either needing discovery on.

  The educator's own account carries the same class_code, which is what
  makes their roster query work. fetchClassmates filters the educator back
  out with .neq("account_type", "org") — an educator is not a classmate.

3.4 Age, and the three signup paths

  Every individual signup gives a date of birth before the account exists.
  apply_age_gate, server-side, decides the path; the client never chooses.

    14 or over                 nothing extra. consent_state 'not_required'.

    Under 14, with a valid     the school's consent covers the account. It
    class code                 works immediately, as any other.

    Under 14, alone            a parent or guardian must agree, twice, by
                               email, at least 24 hours apart. Until both
                               steps are done the account is 'pending': it
                               can sign in but cannot log anything, and sees
                               a waiting screen instead of the app. Once
                               active, the account is permanently locked out
                               of every sharing surface (disclosure_locked):
                               no discovery, no class, no public entries or
                               photos, no community feed, and it cannot see
                               other students either. The lock is enforced by
                               triggers and RLS, not by hiding buttons.

  The guardian is told what is kept (photos, voice notes, journal text) and
  which versions of the Terms and Privacy Policy they are agreeing to. Both
  confirmation timestamps, the guardian's address and those versions are
  stored on the consent record.

  At 14, a guardian-consent account does not unlock automatically. The
  guardian agreed to a no-sharing account; refresh_consent_state moves it
  to 're_consent_required' and the lock stays until a new consent replaces
  it.

  A guardian can, at any time, open the link in their email again to
  withdraw consent ('withdrawn': the account can do nothing and the child
  cannot undo it) or to delete the account and everything in it.

  A waiting child has two ways forward: the guardian agrees, or a teacher
  gives them a class code.

  A new individual account starts as 'age_required' and locked
  (20261011000000), so an account whose signup was cut off before its
  birthday was saved cannot be used until it gives one. The app asks for
  it on the next sign-in.

  Existing accounts created before the age gate (2026-09-18) were not asked
  and remain 'not_required'. That was a deliberate decision ("new signups
  only").


--------------------------------------------------------------------------
4. GOALS AND NON-GOALS
--------------------------------------------------------------------------

4.1 Goals, current build

  Create interests and see them all at once as a garden.

  Log activity in well under a minute. This is a hard performance bar, not
  an aspiration: a student with five minutes of practice to record will not
  fight a UI to record it.

  Make neglect visible. An untended tree changes appearance and can die.
  This is the difference between this product and a streak counter: the
  absence of activity has a visible cost, not just a number that resets.

  Forgive a single bad day. One missed day per rolling week is bridged
  (REST_EVERY_DAYS = 7, src/lib/derived.js). Two misses inside that window
  still break the streak, and an alternating every-other-day pattern
  breaks, by design.

  Reward logging with a currency that buys only appearance.

  Keep everything private unless the student opts in at account level, with
  per-entry and per-photo sharing available below that.

  Never let a child under 14 share anything without an adult's agreement,
  and never let a guardian-consent account share anything at all.

  Give a teacher a class in one step: one code, no configuration.

  Work offline for the core loop, sync in the background, and show the
  student when sync is stuck rather than failing silently. Remember unsent
  changes across app restarts.

  Support English and Chinese as equal first-class languages throughout,
  including all curated content.

  Let a student download everything they made, erase their garden, recover
  a forgotten password, or delete their account entirely.

  Make every report reach an adult.

4.2 Non-goals — not built, not planned

  No direct messaging, comments, or any free-text reply between users.
  This is the highest-risk feature class in a product used by minors and it
  is not required for the value the product delivers.

  No follower counts, public leaderboards, or visible like counts.

  No follow-a-person primitive. The watches table points at an interest,
  never at a user, and there is no follows table. This is enforced by the
  schema so it cannot be added incidentally.

  No infinite feed on any surface.

  No location, no school-identifying data, no contact details. The one
  exception is a guardian's email address, held only for consent.

  No server-sent push notifications. Reminders are local: in the browser
  they fire while the tab is open; in the iPhone app they are scheduled
  with iOS on the phone itself (§10.9).

  No pay-to-win mechanic. Coins buy appearance only. Nothing purchasable
  changes decay rate, growth rate, streak behaviour, or coin yield. Nothing
  is sold for money.

  No cross-class or global discovery.

  No advertising, no analytics, no tracking.


--------------------------------------------------------------------------
5. THE CORE LOOPS
--------------------------------------------------------------------------

5.1 Cultivate — the primary loop

  Open → garden at current health → tap a tree → its "why", recent photos
  and entries, its own streak → log today → growth stage and health respond,
  coins awarded.

  Logging paths, all reachable in two taps from a tree: journal entry (with
  a duration chosen from 15m / 30m / 45m / 1h / 1.5h / 2h), photo, voice
  note. An entry may carry text, audio, or both.

5.2 Tend — the stakes loop

  Every tree carries a schedule (users choose weekdays per tree) and a
  health state derived from days since it was last logged. Nothing about
  health is stored; it is computed at render from the logging history plus
  an optional revived_at timestamp.

  Thresholds, from src/lib/tree.js:
    0-6 days idle    healthy
    7-13 days idle   wilting   (WILT = 7)
    14-29 days idle  bare      (BARE = 14)
    30+ days idle    dead      (DEAD = 30)

  A warning banner appears on Home in the final five days before death
  (DYING_SOON_DAYS = 5), because revival costs coins and a student should
  be able to avoid that cost rather than discover it after the fact. In
  the iPhone app a reminder also arrives the day before a tree dies.

  Revival costs REVIVE_COST = 20 coins and sets revived_at, which resets
  the decay clock. It fails with no state change if the student cannot
  afford it.

5.3 Discover — the secondary loop

  Open Explore → "For you", a short personalised set of hobby ideas drawn
  from categories adjacent to what the student already does, each shown
  with the reason it was suggested → the full curated list, shuffled, with
  a reshuffle control → optionally the class web → optionally the community
  feed → tap an idea for its description → plant it as a tree.

  Ideas the student already has, and ideas already shown in "For you",
  never repeat in the full list.

  Guardian-consent accounts see none of the social half of this loop
  (§3.4); ideas remain.


--------------------------------------------------------------------------
6. SCREENS AND FEATURES
--------------------------------------------------------------------------

6.1 Home — garden (individual accounts)

  A greeting by time of day and name.

  A horizontally swipeable wall of trees, one per interest, each drawn at
  its computed stage and health, with a page indicator.

  A zoomed-out grid view of the whole forest, toggled from the top bar, for
  gardens too large to swipe.

  Streak chip: days logged across all hobbies combined. Logging any one
  tree keeps the whole streak alive. Shows an animated flame, or a leaf
  while a rest day is bridging the gap, so a protected streak never reads
  as an unbroken one.

  Three banner types, distinct and independently triggered:
    Memory banner — a past pinned photo or entry resurfaced.
    Nudge banner  — today is a scheduled day for one or more trees. One
                    tree: "Go do it" and "Later". Several: one pill per
                    tree, and "Later" for all of them.
    Dying banner  — a tree is inside its final five days.

  Trees change foliage colour with the real season (src/lib/season.js):
  winter Dec-Feb, spring Mar-May, summer Jun-Aug, autumn Sep-Nov.

6.2 Home — dashboard (org accounts)

  Class code displayed large with a one-tap copy button.
  Student count and total hobby count across the class.
  Live roster from fetchClassmates. Tapping a student opens a read-only
  sheet showing their public trees.
  Self-heal: if the account has no class code (an interrupted signup, a
  failed mint), the dashboard mints one on load rather than leaving the
  educator permanently unable to receive students.

6.3 Interest detail — the student's own tree

  Header: name, colour, growth stage label, health label, and the tree
  drawn at that state. "Why I love this" is editable inline.

  Stats: total hours, photo count, entry count, this tree's streak.

  Album and Journal, switched by a row of pills.

  Journal: a timeline, newest first. Each entry shows its weekday and date
  on the left and a card on the right with its text, a voice note player
  if present, small "Pinned" and "Public" tags, and edit and delete
  controls.

  Album: photo grid. Tap opens the full viewer. A photo can be pinned as
  the tree's cover image; with no photo, the cover falls back to a
  generated illustration matched to the hobby's category, and below that to
  the first letter of the name.

  Growth replay: an animation stepping through every stage the tree has
  reached, each frame dated to the log that crossed that threshold. Always
  at most five frames regardless of how many logs exist.

  Per-tree reminder schedule (which weekdays).

  Revive action, shown only once the tree is dead.

  Delete is undoable through a toast, then lands in Recently Deleted for
  TRASH_DAYS = 30 before it is gone.

6.4 Public interest view — another student's tree

  Route: /user/:userId/interest/:interestId. Read-only with respect to the
  owner's content. The viewer can:
    start the same hobby, which creates their own separate tree and never
      joins the owner's — it matches by name, not by id;
    log against their own existing tree of that name, if they have one;
    keep an eye on the tree (adds a watches row);
    report the tree, or any individual photo or entry on it;
    block the owner.

6.5 Explore

  Ideas tab (individual accounts only). 39 curated hobby ideas across 7
  categories: sport, art, music, mind, food & grow, outdoors, movement.
  Each idea has a name and description in both languages.

  User search sits above the tabs for all signed-in accounts. Results are
  restricted by users_select to accounts with discovery_enabled = true and
  no block in either direction — enforced in the database, not filtered in
  the client.

  Community tab. A live feed of entries whose authors set shared_to_feed.
  Pulled by pullFeed with a limit of 40, newest first, excluding the
  viewer's own entries, anyone they have blocked, anything a moderator has
  hidden, and anything the viewer has reported. No comments, no reactions,
  no pagination.

  School tab (visible once the account has a class code). Live classmates
  and which hobbies they share with the viewer.

  Ideas and Community are switched by a row of pills.

  Every item on every tab carries a report control; every person carries a
  block control.

6.6 Profile ("Me")

  Avatar with editor. Free always: 6 skin tones, 7 hair colours, 7 outfit
  colours. Purchasable: 8 hair styles and 5 outfit styles beyond the
  defaults. Identity does not cost coins; variety does.

  Coin balance and a link to the Market.

  Stats: streak, tree count, photo count, entry count, public item count.

  Theme: White, Black, or System (DEFAULT_THEME = "system").

  Language toggle. Sound effects toggle. Reminders: asks for permission
  the first time; if the student said no, says where to turn it back on
  (the browser's settings, or Settings › Forest › Notifications on
  iPhone).

  "Let others find me" — the account-level discovery toggle, off by
  default, and absent on guardian-consent accounts.

  Recovery code. Created here, while the student still knows their
  password, and only after re-entering it, so a borrowed unlocked phone
  cannot make one. Shown once, never stored readably (bcrypt), single use.
  Redeemed from the sign-in screen with the username to set a new
  password. Five wrong codes lock that account's code for fifteen minutes,
  and a locked account answers exactly like a wrong code, so the screen
  cannot be used to find out which usernames exist.

  Join a class. Badges. Year in Review. Memories. Recently Deleted.
  Hobbies you're watching.

  Username change, checked server-side for availability before it commits
  locally; a taken name surfaces inline as 23505 rather than appearing to
  save and then reverting.

  Download my data. One zip: the journal as a text file, every photo and
  voice note, and everything as machine-readable JSON. In the iPhone app
  it is offered through the share sheet.

  Help and support, Privacy Policy, Terms of Use.

  Clear all data. Erases every tree, photo, entry and voice note both
  locally and on the server, including both Storage buckets, and keeps the
  account and profile. Reports which half succeeded.

  Delete my account. Two-tap, with the consequence stated before the
  confirming tap. Removes every file in both Storage buckets, in batches
  of 1,000 until none are left, then deletes the auth row, which cascades
  every table. If any file cannot be removed, the account is left in place
  and the student is told to try again, so no file is ever orphaned.

  Log out. If changes have not reached the server yet, the first tap says
  so and retries; the second logs out regardless.

  Reports (moderators only, §9.5).

6.7 Market

  8 hobby-badge decorations (Piano, Painting, Basketball, Football, Guitar,
  Reading, Swimming, Cooking), each a coloured ring plus an emoji badge,
  equippable on the avatar. Owned-but-unequipped items show an equip
  button; unaffordable items are disabled with their price visible.

6.8 Signup and onboarding

  Signup, before the account exists:
    Individual   account type → date of birth (plus optional class code)
                 → username and password
    Org          account type → email and password

  Date of birth is three dropdowns (year, month, day), most recent year
  first, rather than a native date picker that opens on today and orders
  fields by browser locale.

  After signup the server's age decision routes the account: straight
  into onboarding, or to the waiting-for-a-grown-up screen (§3.4).

  Onboarding:
    Individual, 7 steps:
      intro → gender → interests → confirm → schedule → look → notifications
    Org, 3 steps:
      intro → look → notifications

  Gender selects a starting hair style and nothing else. It is not stored
  as a demographic field, is never displayed, and is freely changed later
  from the avatar editor. "Prefer not to say" keeps the shared default.

  Interests are filtered at entry: video-game and social-media names are
  rejected as hobbies, in both languages, before they can become a tree.

  Look offers Light, Dark and System, each with its own small animated
  drawing.

  Notifications asks on its own screen, with an explanation, before the
  system prompt; "Not now" leaves the question unanswered so it can be
  asked again from Me.

  Completion writes onboarding_completed = true.

6.9 Screens outside the app

  Reached by link, with no account and no session:
    /privacy, /terms, /support   the policies and the help page, for a
                                 parent or reviewer who has no account
    guardian consent link        what the guardian is agreeing to, the
                                 confirm button for step one or two, and
                                 withdraw or delete

  Inside a session but instead of the app:
    Waiting for a grown-up       pending accounts: send or resend the
                                 guardian email, enter a class code, check
                                 again, log out, delete the account
    Switched off                 withdrawn accounts: log out or delete,
                                 nothing else
    When were you born?          age_required accounts: the birthday step
                                 again

6.10 Shared interaction patterns

  Destructive actions hide the item immediately and hold the real delete
  behind an undo toast, rather than prompting for confirmation first.

  Nearly every add or edit interaction is a bottom sheet rather than a page
  navigation, in service of the under-a-minute bar.

  The language toggle is present in nearly every top bar.

  A sync indicator appears only after something has been stuck for 30
  seconds, and offers a manual retry.

  Badges: 12 total, across four families — logs (1, 25, 100), streak (3, 7,
  30, 100), trees planted (1, 5) and species variety (5), fully grown trees
  (1, 3).

  Visual language (src/styles/workspace.css, loaded last so it can be
  replaced without touching behaviour): mostly matte grey-black and very
  light grey — an off-white page, white cards with large corners and a
  faint shadow, heavy headings, grey-black for whatever is selected or
  primary, every text button fully rounded. Colour appears only in small
  tinted tags with thin line icons (src/components/shared/Icon.jsx), in
  four soft tones — amber, green, purple, blue — used for a journal
  entry's duration, voice note, pinned and public state, Explore's
  categories, the memory card, "planted", and the stat badges.


--------------------------------------------------------------------------
7. DATA MODEL
--------------------------------------------------------------------------

Thirteen tables. Row-level security is enabled on all of them. IDs on
content tables are text, not uuid, because the client generates them
offline before any server round-trip; users.id is a uuid because it is
always auth.uid().

7.1 users

  id                    uuid, PK, references auth.users on delete cascade
  display_name          text, unique index, case-insensitive search index
  avatar                text, JSON blob of avatar parts
  bio                   text — DEAD, never read by any code
  account_type          text, individual | org, frozen after signup (§9)
  discovery_enabled     boolean, default false
  default_visibility    text, forced to 'private' on locked accounts
  class_code            text, writable only via the join functions
  onboarding_completed  boolean, default false
  coins                 integer, default 0
  owned_decorations     text[]
  owned_hair            text[]
  owned_outfits         text[]
  equipped_decoration   text
  lang, theme           text
  sound_on              boolean, default true
  birthdate             date, set once by apply_age_gate
  consent_state         text: not_required | age_required | pending |
                        active | re_consent_required | withdrawn
  disclosure_locked     boolean, the no-sharing lock (§3.4)
  created_at            timestamptz

  birthdate, consent_state and disclosure_locked cannot be written by the
  client at all; users_01_protect_consent restores them on any update not
  made by a consent function.

7.2 interests (a tree)

  id           text, PK, client-generated
  user_id      uuid, owner, cascade
  name         text
  why          text
  color        text, palette key
  days         integer[], which weekdays this tree expects activity
  species      text, one of 9, cosmetic
  leaf_color   text, one of 4 palettes, cosmetic
  revived_at   timestamptz, resets the decay clock
  deleted_at   timestamptz, tombstone for Recently Deleted
  hidden_at    timestamptz, set by a moderator
  created_at / updated_at

7.3 entries (a journal log)

  id              text, PK
  interest_id     text, cascade
  date            text, the day being logged
  text            text
  minutes         integer, defaults to 30 for rows predating the field
  visibility      text, independent of everything above it
  is_pinned       boolean, eligible for the memory banner
  shared_to_feed  boolean, this is what a community post is
  audio_path      text, voice note in Storage
  audio_ms        integer, duration
  deleted_at      timestamptz
  hidden_at       timestamptz, set by a moderator
  created_at / updated_at

  There is no user_id. Ownership is the parent interest's user_id, and
  every policy and trigger that needs the owner joins through interests.
  (20260918000000 assumed otherwise and broke every entry and photo save
  for two weeks; 20261010000000 repaired it.)

  There is no posts table. A community post is an entry with
  shared_to_feed = true.

7.4 photos

  id            text, PK
  interest_id   text, cascade
  storage_path  text, {uid}/{photoId}.jpg
  caption       text
  visibility    text
  is_pinned     boolean, marks the tree's cover image
  deleted_at    timestamptz
  hidden_at     timestamptz
  created_at

  No user_id, as for entries.

7.5 classes, watches, blocks, reports, moderators, blocked_terms

  classes     code text PK, owner_id uuid unique. Readable only by its
              owner.

  watches     (user_id, interest_id) unique. Points at an interest, never a
              user.

  blocks      (user_id, blocked_user_id) unique. Every visibility check
              tests the pair in both directions.

  reports     id, reporter_id, target_type (interest|photo|entry|user),
              target_id, reason, status (open|actioned|dismissed),
              created_at.

  moderators  user_id PK, added_at, note. No policies at all: only a
              database admin can add a row, so being a moderator cannot be
              granted by anything the app does.

  blocked_terms  the server's copy of the text filter's word list (§9.6).

7.6 Consent and recovery

  guardian_consents  user_id, kind (u14_internal_only), guardian_channel
                     ('email'), guardian_contact, step1/step2 token hashes,
                     sent and confirmed timestamps for both steps,
                     step2_not_before (24 hours after step one),
                     terms_version, privacy_version, status (pending |
                     active | revoked | superseded), failed_attempts.
                     Old records are never deleted while the account
                     exists: they are the evidence.

  consent_outbox     emails waiting to be sent: to_address, token,
                     subject, body, send_after, sent_at, attempts,
                     claimed_at. Readable by nobody but the email worker
                     (service role).

  recovery_codes     user_id PK, code_hash (bcrypt), used_at,
                     failed_attempts, locked_until. No policies; reached
                     only through three definer functions.

7.7 Storage

  Two private buckets, neither with the Supabase "public" flag:
    photos       {uid}/{photoId}.jpg
    voice-notes  {uid}/{entryId}

  Both are flat, one folder per owner uid. Storage has no foreign keys, so
  every path that erases content sweeps the buckets explicitly.

  A moderator can read a file only while it is the subject of an open
  report (moderator_can_read, 20261011010000).

7.8 Derived signup address

  Individuals have no email. usernameToEmail lowercases the username,
  replaces every character outside [a-z0-9._-] with a dash, strips leading
  and trailing punctuation, and appends @users.forestapp.invalid. The TLD
  is reserved, so nothing derived here can reach a real inbox.

7.9 Sync model

  Local-first. Every write lands in IndexedDB first and renders
  immediately, then pushes to Supabase in the background.

  Failed pushes are tracked per record and retried: on a 45-second timer,
  on the browser's online event, on demand from the sync indicator, and
  once more right after sign-in reconciliation. The list of records still
  owing a push is saved per account (src/lib/pendingSync.js), so an edit
  that failed is still retried after the app is closed and reopened. The
  retry reads each record's current local copy, never a stale snapshot.

  Schema drift is handled: a push rejected with PGRST204 names the
  unrecognised column, which is dropped from the payload and the push
  retried.

  On sign-in a one-time reconciliation runs: local records not on the
  server are pushed, server records not cached locally are pulled down.
  It compares IDs only (§14.6).

  If a different account signs in on a device that still holds a previous
  account's cache, the cache is wiped first. The app's language is only
  ever taken from the signed-in account's own profile, so a new account
  does not inherit the last person's language.

  Signing out wipes the local cache entirely, profile included.

7.10 Derived, never stored

  Growth stage, health, streaks and rest days, hours, the Explore
  recommendation set, badges, the memory-banner candidate, and the
  iPhone reminder schedule are all computed from the tables above.


--------------------------------------------------------------------------
8. COINS, GROWTH AND DECAY
--------------------------------------------------------------------------

8.1 Earning. COINS_PER_LOG = 5 per logged entry or photo. This is the only
faucet.

8.2 Spending. Hobby-badge decorations, and hair and outfit styles beyond
the free defaults. Every priced item is cosmetic. Coins cannot be bought.

8.3 Growth. Five stages: seed, sprout, sapling, young, full. STAGE_COSTS =
[5, 6, 7, 8], giving thresholds at 5, 11, 18 and 26 total logs. Entries and
photos both count.

8.4 Decay. Thresholds as in §5.2. The clock counts days since the most
recent of: a journal entry, a photo, a revival, or — for a tree with no
logs at all — the day it was planted.

8.5 Rest days. One missed day per rolling 7-day window is bridged rather
than fatal. Two misses inside the window break it.

8.6 Revival. REVIVE_COST = 20, sets revived_at, resets the clock, fails
cleanly when unaffordable.

8.7 Open design risk. The decay mechanic cannot distinguish a student who
lost interest from one who had exams, was ill, or had a hard week at home.
A dead tree may read as punishment rather than a prompt. This is the
largest unvalidated product assumption in the system (§14.8).


--------------------------------------------------------------------------
9. SOCIAL, DISCOVERY AND SAFETY
--------------------------------------------------------------------------

9.1 Constraints, by design

  No direct messaging, comments, or free-text replies anywhere.
  No follow-a-person primitive; watching points at a hobby.
  No follower counts, leaderboards, or visible like counts.
  No infinite scroll. The feed is capped at 40 items.
  No location, real names beyond a chosen display name, or
    school-identifying fields.
  Discovery is opt-in and off by default.
  Visibility is granular to the individual entry and photo.
  Under-14s share nothing without an adult's agreement; guardian-consent
    accounts share nothing ever.
  All social surfaces are scoped to a class, or to accounts that opted into
    being findable. No cross-class discovery exists.

9.2 How visibility is actually enforced

  Every rule below is an RLS policy or trigger in Postgres. The client is
  not trusted with any of it.

  users_select      own row; or discovery_enabled = true; or same
                    class_code — with no block in either direction, and
                    never for a viewer who is themselves locked.

  interests_select  own rows; or the owner is discoverable or a classmate,
  entries_select    and the row is not deleted, not hidden by a moderator,
  photos_select     not reported by this viewer, not blocked either way,
                    and the viewer is not locked. Entries and photos must
                    also be public themselves.

  Write side        consent_allows_writing() blocks every entry and photo
                    insert while an account is age_required, pending or
                    withdrawn. The disclosure-lock triggers on users,
                    entries and photos reject any attempt by a locked
                    account to become discoverable, join a class, or make
                    anything public.

  Storage           a file is readable in the requester's own folder, if
                    its row is visible under the rules above, or by a
                    moderator while it is under an open report.

9.3 Privilege boundaries

  Frozen by triggers, because users_update_self is deliberately broad:

    account_type     set once at signup. Any later change raises.
    class_code       changeable only inside the join functions.
    birthdate,       changeable only inside the consent functions, which
    consent_state,   set a transaction-local flag. A direct write is
    disclosure_locked silently restored.

  The classes table is readable only by its owner, so a class code cannot
  be discovered by listing the table.

9.4 Report and block

  Reachable wherever the thing is looked at: a user's profile, a public
  tree, a photo in the viewer, an individual journal entry, a feed post.

  Both act optimistically. What a student reports disappears for them at
  once and stays gone after a refresh (i_reported, 20260920020000),
  whether or not a moderator has looked at it yet. Reporting does not hide
  it from anyone else; that is a moderator's decision.

9.5 Moderation

  Moderators are named by a database admin (§7.5). They see Me → Reports
  (/reports): every open report with the reported text, the reported photo
  or a player for the reported voice note, who filed it, and when. They
  can hide or unhide the content (for everyone but its owner), and mark
  the report actioned or dismissed. They cannot delete a child's work or
  read anything that was never published.

  English only, on purpose: it is a staff tool.

9.6 Content filter

  Hobby names: video games and social media are rejected at entry
  (src/lib/hobbyFilter.js).

  Text: a hand-checked list of curse words and slurs, including their
  common censored spellings, is checked in the app before anything is
  shared (src/lib/textFilter.js) and again in the database
  (public.blocked_terms, enforced by triggers on entries and photos), so a
  modified client cannot bypass it. It is a first line of defence, not
  moderation.


--------------------------------------------------------------------------
10. TECHNICAL ARCHITECTURE
--------------------------------------------------------------------------

10.1 Stack

  React 18, Vite 7, React Router 7, Supabase JS 2, Dexie 4, JSZip,
  Capacitor 8 for the iPhone app. No UI framework, no CSS framework, no
  state library. State is React contexts: AuthContext, StoreContext,
  UIContext, I18nContext.

10.2 Routes

  /                                      garden, or educator dashboard
  /interest/:id                          own tree
  /user/:userId/interest/:interestId     someone else's tree
  /explore
  /profile
  /market
  /reports                               moderators only
  /privacy, /terms, /support             no session needed
  guardian consent link                  no session needed
  *                                      redirect to /

  Sheets are not routed. A tapped iPhone reminder opens the screen it
  points to (a tree, or Home), including when it launched the app.

10.3 Storage and offline

  IndexedDB via Dexie, four stores: meta, interests, entries, photos.
  The pending-sync list is in localStorage, keyed per account.

  PWA: manifest plus service worker, registered in production on the web
  only, never inside the iPhone app.

10.4 Media handling

  Photos are capped at MAX_PICK_BYTES = 25 MB before decode, scaled so the
  long edge is at most 1600 px, and always re-encoded to JPEG at quality
  0.82 on a canvas. The re-encode is unconditional, which also removes
  embedded location and camera metadata.

  Voice notes are recorded in-app and uploaded to the voice-notes bucket
  with the entry's id as the filename.

10.5 Error handling

  A root error boundary wraps the providers, and a per-route boundary
  keyed on pathname means one crashed screen does not take the tab bar
  with it. Errors go to the console only (§14.10).

10.6 Tests

  Vitest, 116 tests across 10 files, run under TZ=Asia/Singapore. Covers
  streaks and rest days, growth and health, dates, the derived address,
  recovery codes, the text filter, guardian links, data export, the saved
  sync list, and the iPhone reminder schedule. Nothing tests RLS, sync
  end-to-end, or any component.

10.7 Deployment

  Website: GitHub Pages via GitHub Actions on every push to main, with a
  404.html redirect for client-side deep links.

  Database: migrations are applied by hand in the Supabase SQL editor
  (§14.13). Every file in supabase/migrations/ is applied to the live
  project as of 2026-10-11.

10.8 The iPhone app

  Capacitor wraps the same build (appId org.tkethicscamp.forest). iPhone
  only (TARGETED_DEVICE_FAMILY = 1), iOS 15 and later. Camera, microphone
  and photo-library permission messages in English and Chinese. Declares
  standard encryption only. Inside the app (html.native) the layout fills
  the screen and keeps clear of the notch and home bar; the website keeps
  its phone-shaped card. Files from Download my data go through the iOS
  share sheet.

  Not yet built and run on a simulator or a phone (§14.3).

10.9 Reminders

  Browser: the Notification API, while the tab is open, at most one
  grouped reminder per day plus tree warnings.

  iPhone: @capacitor/local-notifications. A week of reminders is planned
  (src/lib/reminderPlan.js) and handed to iOS: 5 pm (REMINDER_HOUR = 17)
  on each scheduled day, leaving out today for anything already logged,
  plus a warning the day before a tree dies. Re-planned whenever the
  garden, the language or the permission changes. Capped at 60, under
  iOS's limit of 64.

10.10 Guardian email

  A worker (supabase/functions/send-consent-email) claims rows from
  consent_outbox with SKIP LOCKED, so two overlapping runs never send the
  same email twice, and sends them through Resend. A pg_cron schedule
  (schedule.sql) runs it every five minutes. Written, not deployed (§14.1).


--------------------------------------------------------------------------
11. LOCALIZATION
--------------------------------------------------------------------------

505 string keys, each an [en, zh] pair. Coverage includes UI copy,
onboarding, error messages, all 39 hobby ideas and their descriptions, all
7 category labels, the Privacy Policy, the Terms, the help page, and the
guardian consent page — not only the chrome. Exceptions, on purpose: the
moderator screen and the guardian email are English only.

The toggle is present in nearly every top bar and applies immediately.
Hobby names have both forms, and "do I already have this hobby" matches on
either.


--------------------------------------------------------------------------
12. BUILD STATUS
--------------------------------------------------------------------------

12.1 Live and real

  Accounts and auth. Sync, with retry, a visible stuck state and a list
  that survives restarts. Classes, class codes and rosters. User search.
  The community feed. Photo and voice-note storage. Coins, purchases and
  the market. Report and block. Moderation. Content filter. Age gate and
  guardian consent (except sending the email). Recovery codes. Data
  export. Account deletion. Recently Deleted. Badges, Year in Review,
  Memories, growth replay, seasons, rest days. Privacy Policy, Terms and
  help page (draft text).

12.2 Built, not yet running

  Guardian emails: the worker and schedule exist but are not deployed,
  because there is no sending domain yet. Until then an under-14 child
  signing up alone waits for an email that never comes; a class code is
  the only way in.

  The iPhone app: the project exists and has not yet been built.

12.3 Fixture data, remaining

  One place only: the demo classmate cards in StudentSheet, which use the
  STUDENTS constant. The educator roster and the School tab are live.

12.4 Removed deliberately

  The demo garden. The guided mascot tour. The per-tree visibility toggle.
  The "who you do this with" field. The daily learning goal.

12.5 Migration history, 37 files

  20260723000000  multi-user schema: users, interests, entries, photos,
                  watches, blocks, reports, and all initial RLS
  20260723000001  table privileges
  20260724000000  unique display_name
  20260725000000  interest appearance columns
  20260824000000  classes table, per-educator codes, users.class_code
  20260824000001  fix users_select recursion via a definer function
  20260825000000  tree visibility collapsed into account-level discovery
  20260828000000  photos Storage bucket and policies
  20260830000000  onboarding_completed
  20260830010000  photo storage update policy
  20260831000000  user coins
  20260831010000  daily goal (later dropped)
  20260901000000  feed posts index
  20260902000000  photo storage select fix
  20260907000000  trash tombstones
  20260908000000  sound setting sync
  20260908010000  drop dead interest columns, drop watches
  20260908020000  drop daily goal
  20260908030000  owned items sync
  20260908040000  lang and theme sync
  20260908050000  voice notes bucket and columns
  20260912000000  lock class membership, freeze account_type
  20260912010000  account deletion
  20260912020000  rebuild watches
  20260912030000  account recovery codes
  20260917000000  account deletion survives storage
  20260917010000  recovery code needs the password; guessing limit
  20260918000000  age gate and guardian consent
  20260920000000  content filter
  20260920010000  moderation queue, moderators
  20260920020000  what you reported stays hidden for you
  20260926000000  class-code signup fixed; class code from the waiting screen
  20260926010000  guardian emails claimed once
  20260926020000  guardian can withdraw or delete
  20261010000000  entry and photo saves repaired (ownership via interests)
  20261011000000  new accounts locked until they give an age
  20261011010000  moderator can see reported photos and voice notes


--------------------------------------------------------------------------
13. SUCCESS CRITERIA
--------------------------------------------------------------------------

None of these have been met, because none have been attempted with real
students. They are the bar, not a report.

13.1 The log-an-entry loop is under a minute on a real phone, measured from
a cold app open by an actual student.

13.2 Decay reads as motivating rather than punishing across a multi-week
trial that includes at least one student having a genuinely bad week.

13.3 A garden survives real conditions: closing the app, losing wifi
mid-session, switching devices, and sharing a phone with a sibling who has
their own account.

13.4 At least one student uses it unprompted for more than a week and can
say in their own words what brought them back, or what stopped them.

13.5 Visibility is demonstrated, not asserted: show live that a private
entry, and everything belonging to a locked account, is invisible to a
second real account querying directly.

13.6 A report filed by a child is seen by an adult inside a defined window.
Now possible (§9.5); the window and the person are not yet decided
(§14.4).

13.7 A guardian receives the permission email, agrees twice, and the
child's account switches on — end to end, with a real inbox.


--------------------------------------------------------------------------
14. KNOWN LIMITATIONS AND OPEN QUESTIONS
--------------------------------------------------------------------------

Ordered by what stands between this build and real children using it.

14.1 Guardian emails are not sent. BLOCKER for under-14s signing up alone.
  Needs a domain, a Resend account, the worker deployed, and the schedule
  turned on. Until then those children can only get in with a class code.

14.2 Policies are drafts. BLOCKER.
  The Privacy Policy and Terms are accurate about the app but have not been
  read by a lawyer, and do not yet name the legal entity responsible, the
  governing law, or a contact address. Versions: Terms 2026-09-18.draft,
  Privacy 2026-10-11.draft. Bump the version on any change to what is
  collected or who can see it.

14.3 The iPhone app has never been built or run. BLOCKER for the App Store.
  Also needed: an Apple Developer account in an adult's name, the app
  record, a real icon, screenshots, the App Privacy answers, the age
  rating, and a test account for Apple's reviewer (a class-code account,
  so they skip the guardian email).

14.4 Nobody is named to read reports or support email. BLOCKER.
  Moderation works, but a moderator row has to point at a real adult who
  checks it on a schedule. SUPPORT_EMAIL is deliberately empty until an
  address exists that the project owns.

14.5 A class code is not proof a school agreed.
  Anyone with a valid code skips the guardian step. Codes are not
  discoverable (§9.3), but they are handed around. The team needs to decide
  whether that is acceptable.

14.6 Two devices editing the same record: the last save wins.
  Reconciliation compares IDs, and edits do not carry a reliable
  updated-at, so a stale edit from one device can overwrite a newer one
  from another.

14.7 Guardian-requested deletion may leave files.
  When a parent deletes the account from the email link there is no
  signed-in app to remove the files through the Storage API, and the
  database's own sweep of storage is best-effort: deleting storage rows
  directly is a permission the project may not have, and a failure there
  is skipped so the account deletion itself still happens. Move the sweep
  to the email worker or an edge function with the service role.

14.8 Decay tuning is unvalidated under real conditions.
  See §8.7. A product-design risk rather than a tuning task.

14.9 No automated image screening.
  Photos are visible to classmates and to anyone the owner is discoverable
  to. Nothing inspects them; moderation is after the fact.

14.10 No error monitoring in production.
  A crash is discovered when a child tells a teacher.

14.11 Test coverage stops at pure logic.
  RLS and the consent triggers are where the real risk is and they are
  untested. Two real bugs this month (class-code signup, entry and photo
  saves) were in exactly that layer and were found by hand.

14.12 The name.
  "Forest" is taken on the App Store by an app that also grows trees.
  Choose a new name before any store listing. The codebase also still
  says "orb" in component and CSS names.

14.13 Supabase migration history is not tracked by the CLI.
  Migrations are applied by hand in the SQL editor, so `supabase db push`
  will disagree with reality the first time someone runs it. A migration
  that fails part-way in the editor can also leave the database half
  changed (20260918000000 did), so every migration should be checked
  afterwards with a query that proves it landed.

14.14 Accessibility beyond the basics.
  No screen-reader pass, no large-text pass. Reduced motion is respected.

14.15 One dead column.
  users.bio is read by nothing.


--------------------------------------------------------------------------
MAINTENANCE NOTE
--------------------------------------------------------------------------

Earlier revisions described features as missing or fixture-backed months
after they shipped, and described tables that had been dropped. Both
errors came from reading early files and not later ones.

Every claim in this revision was checked against src/ and
supabase/migrations/ on 2026-10-11. Check it again rather than trusting it.
