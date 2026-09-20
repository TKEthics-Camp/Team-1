PRODUCT REQUIREMENTS DOCUMENT — FOREST (森林)

A hobby tracker for secondary-school students. Each interest is a tree that
grows when the student logs real activity against it and dies if they stop.

Revised 2026-09-12. Supersedes the 2026-08-15 revision.
Section numbers are cited from code comments and migrations (PRD §7, PRD §9
both appear in src/ and supabase/migrations/). Renumber only with a matching
pass over those references.

Every figure in this document was read out of the code on 2026-09-12.
Where a number appears, the constant it came from is named.


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
for one idea were routinely set inconsistently.

Alongside the garden is Explore: curated hobby ideas, classmates who share
interests, and a small feed of journal entries their authors chose to
share. It is a finder, not a feed — finite, no comments, no infinite
scroll.

The product competes for attention that would otherwise go to games and
short video. It uses the same mechanics those use — streaks, unlocks, a
small pending reward — pointed at activity that happened away from the
phone.


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

  Secondary-school students, roughly 13-18. Originally scoped to rural
  Jiangxi; nothing in the build depends on that context.

  Signs up with username and password only. No email is collected, because
  a meaningful share of the target users do not have one. Supabase Auth
  requires an address, so one is derived from the username (§7.7).

  Lands on Home, which is their garden.

  Gets: garden, trees, journal, album, voice notes, coins, market, avatar,
  Explore with all three tabs, badges, year in review, memories, recently
  deleted, watching list.

3.2 Org (educator)

  A teacher or school. Signs up with a real email, since only educators
  need a reachable address.

  Lands on Home, which is a dashboard, not a garden. Has no trees, cannot
  plant one, and the "start this hobby" affordances are hidden throughout.

  Gets: class code with copy button, student count, total hobby count,
  live roster, read-only student sheets.

  Onboarding is three steps rather than seven (§6.8).

3.3 The link between them

  An educator's class code is minted automatically at the end of their
  onboarding by mintOrFetchClassCode, which generates a random code,
  inserts it into classes, and retries on collision up to five times.

  A student joins from Me → Join a class by typing the code. The join is
  validated server-side by join_class(), a security-definer function that
  checks the code exists and writes users.class_code in the same call.

  Once class_code matches, users_select's third branch makes the two
  accounts mutually visible, and interests_select's class branch makes
  their trees visible to each other without either needing discovery on.

  The educator's own account carries the same class_code, which is what
  makes their roster query work. fetchClassmates filters the educator back
  out with .neq("account_type", "org") — an educator is not a classmate.


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

  Give a teacher a class in one step: one code, no configuration.

  Work offline for the core loop, sync in the background, and show the
  student when sync is stuck rather than failing silently.

  Support English and Chinese as equal first-class languages throughout,
  including all curated content.

  Let a student erase their garden, or delete their account entirely.

4.2 Non-goals — not built, not planned

  No direct messaging, comments, or any free-text reply between users.
  This is the highest-risk feature class in a product used by minors and it
  is not required for the value the product delivers.

  No follower counts, public leaderboards, or visible like counts.

  No follow-a-person primitive. The watches table points at an interest,
  never at a user, and there is no follows table. This is enforced by the
  schema so it cannot be added incidentally.

  No infinite feed on any surface.

  No location, no school-identifying data, no contact details.

  No server-dependent push notifications. Reminders are local, in-browser,
  opt-in, scheduled client-side per tree.

  No pay-to-win mechanic. Coins buy appearance only. Nothing purchasable
  changes decay rate, growth rate, streak behaviour, or coin yield.

  No cross-class or global discovery.


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
  be able to avoid that cost rather than discover it after the fact.

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


--------------------------------------------------------------------------
6. SCREENS AND FEATURES
--------------------------------------------------------------------------

6.1 Home — garden (individual accounts)

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
    Nudge banner  — today is a scheduled day for one or more trees.
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

  Stats row: total hours, photo count, entry count, this tree's streak.

  Journal tab: reverse-chronological entries. Each shows the date, the
  text, a voice note player if present, and edit and delete controls.
  Pinned entries are marked; public entries are marked.

  Album tab: photo grid. Tap opens the full viewer. A photo can be pinned
  as the tree's cover image; with no photo, the cover falls back to a
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
  viewer's own entries and anyone they have blocked. No comments, no
  reactions, no pagination.

  School tab (visible once the account has a class code). Live classmates
  and which hobbies they share with the viewer.

  Every item on every tab carries a report control; every person carries a
  block control.

6.6 Profile ("Me")

  Avatar with editor. Free always: 6 skin tones, 7 hair colours, 7 outfit
  colours. Purchasable: 8 hair styles and 5 outfit styles beyond the
  defaults. Identity does not cost coins; variety does.

  Coin balance and a link to the Market.

  Stats: streak, tree count, photo count, entry count, public item count.

  Theme: White, Black, or System (DEFAULT_THEME = "system"). Three options,
  not the eight gradient themes an earlier revision of this document
  described.

  Language toggle. Sound effects toggle. Reminder permission request.

  "Let others find me" — the account-level discovery toggle, off by
  default. This is the only account-level visibility control that exists.

  Join a class. Badges. Year in Review. Memories. Recently Deleted.
  Hobbies you're watching.

  Username change, checked server-side for availability before it commits
  locally; a taken name surfaces inline as 23505 rather than appearing to
  save and then reverting.

  Clear all data. Erases every tree, photo, entry and voice note both
  locally and on the server, including both Storage buckets, and keeps the
  account and profile. Reports which half succeeded — a server failure
  says so explicitly, because that is the case where the data returns at
  the next sign-in.

  Delete my account. Two-tap, with the consequence stated before the
  confirming tap. Clears both Storage buckets, then deletes the auth row,
  which cascades every table.

6.7 Market

  8 hobby-badge decorations (Piano, Painting, Basketball, Football, Guitar,
  Reading, Swimming, Cooking), each a coloured ring plus an emoji badge,
  equippable on the avatar. Owned-but-unequipped items show an equip
  button; unaffordable items are disabled with their price visible.

6.8 Onboarding

  Account type, username and password are all chosen at signup, before
  onboarding starts. Onboarding never asks for them again.

  Individual, 7 steps:
    intro → gender → interests → confirm → schedule → look → notifications
  Org, 3 steps:
    intro → look → notifications

  Gender selects a starting hair style and nothing else. It is not stored
  as a demographic field, is never displayed, and is freely changed later
  from the avatar editor. "Prefer not to say" keeps the shared default.

  Interests are filtered at entry: video-game and social-media names are
  rejected as hobbies, in both languages, before they can become a tree.

  Completion writes onboarding_completed = true. This is an explicit flag.
  It replaced an inference from whether display_name was set, which broke
  the moment signup started reserving the username early — every new
  account then looked already-onboarded and skipped the flow entirely.

6.9 Shared interaction patterns

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


--------------------------------------------------------------------------
7. DATA MODEL
--------------------------------------------------------------------------

Nine tables. Row-level security is enabled on all of them. IDs on every
table except users are text, not uuid, because the client generates them
offline before any server round-trip; users.id is a uuid because it is
always auth.uid().

7.1 users

  id                    uuid, PK, references auth.users on delete cascade
  display_name          text, unique index, case-insensitive search index
  avatar                text, JSON blob of avatar parts
  bio                   text — DEAD, never read by any code
  account_type          text, individual | org, frozen after signup (§9)
  discovery_enabled     boolean, default false
  default_visibility    text — DEAD, superseded by 20260825000000
  class_code            text, writable only via join_class()
  onboarding_completed  boolean, default false
  coins                 integer, default 0
  owned_decorations     text[]
  owned_hair            text[]
  owned_outfits         text[]
  equipped_decoration   text
  lang, theme           text
  sound_on              boolean, default true
  created_at            timestamptz

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
  created_at / updated_at

  Dropped over time: visibility (20260825000000 collapsed it into the
  account-level setting), and category, friends, inspired_by, time
  (20260908010000, all dead).

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
  created_at / updated_at

  There is no posts table. A community post is an entry with
  shared_to_feed = true plus an index to query them. A post therefore
  cannot drift from the entry it came from, and deleting the entry removes
  the post with no extra bookkeeping.

7.4 photos

  id            text, PK
  interest_id   text, cascade
  storage_path  text, {uid}/{photoId}.jpg
  caption       text
  visibility    text
  is_pinned     boolean, marks the tree's cover image
  deleted_at    timestamptz
  created_at

  Bytes live in the private 'photos' bucket. Locally the Blob is held in
  IndexedDB. A photo whose bytes are not on this device is fetched from
  Storage lazily, the first time something tries to display it, and cached
  back into IndexedDB if it belongs to the viewer.

7.5 classes, watches, blocks, reports

  classes    code text PK, owner_id uuid unique. One row per educator.
             Readable only by its owner (20260912000000).

  watches    (user_id, interest_id) unique. Points at an interest, never a
             user. Dropped in 20260908010000 when it was dead code, rebuilt
             in 20260912020000 once a feature needed it.

  blocks     (user_id, blocked_user_id) unique. A row means the first
             blocked the second. Every visibility check tests the pair in
             both directions, so a block is mutual disengagement, not a
             one-way mute.

  reports    id, reporter_id, target_type (interest|photo|entry|user),
             target_id, reason, status (open|actioned|dismissed),
             created_at. Insert-own and select-own policies only. There is
             deliberately no update policy: changing a report's status is
             service-role work that bypasses RLS entirely (§14.1).

7.6 Storage

  Two private buckets, neither with the Supabase "public" flag:
    photos       {uid}/{photoId}.jpg
    voice-notes  {uid}/{entryId}

  Both are flat, one folder per owner uid, which is what makes the storage
  policies a path-prefix comparison and makes a full sweep on deletion a
  single list-and-remove per bucket.

  Storage has no foreign keys. Deleting a photos row does not delete its
  file. Every path that erases content therefore sweeps the buckets
  explicitly — both "clear all data" and delete_my_account do.

7.7 Derived signup address

  Individuals have no email. usernameToEmail lowercases the username,
  replaces every character outside [a-z0-9._-] with a dash, strips leading
  and trailing punctuation, and appends @users.forestapp.invalid. The TLD
  is reserved, so nothing derived here can reach a real inbox.

  Login re-derives the same address rather than looking anything up, so the
  function only needs to be consistent with itself, never deliverable. Two
  usernames differing only in stripped characters collide; display_name's
  unique index is the real uniqueness gate and a collision surfaces as
  Supabase's own "already registered" error.

7.8 Sync model

  Local-first. Every write lands in IndexedDB first and renders
  immediately, then pushes to Supabase in the background. The local copy is
  authoritative until a push succeeds.

  Failed pushes are tracked per record and retried: on a 45-second timer,
  on the browser's online event, and on demand from the sync indicator. The
  retry reads each record's current Dexie copy, never a stale snapshot from
  when it first failed, and drops any record that has since been deleted
  locally rather than re-creating it.

  Schema drift is handled rather than assumed. A push rejected with
  PGRST204 names the unrecognised column; that column is dropped from the
  payload and the push retried, repeatedly, so a project missing one
  migration but not another still saves everything else instead of failing
  the whole write.

  On sign-in a one-time reconciliation runs: local records not on the
  server are pushed and claimed under that account, server records not
  cached locally are pulled down.

  If a different account signs in on a device that still holds a previous
  account's cache, the cache is wiped before anything else happens, so one
  student's garden cannot bleed into another's session on a shared phone.

  Signing out wipes the local cache entirely, profile included.

7.9 Derived, never stored

  Growth stage, health, streaks and rest days, hours, the Explore
  recommendation set, badges, and the memory-banner candidate are all
  computed at render time from the tables above.


--------------------------------------------------------------------------
8. COINS, GROWTH AND DECAY
--------------------------------------------------------------------------

8.1 Earning. COINS_PER_LOG = 5 per logged entry or photo. This is the only
faucet. There is no daily login bonus and no other source, so coins cannot
be decoupled from the activity they exist to reinforce.

8.2 Spending. Hobby-badge decorations, and hair and outfit styles beyond
the free defaults. Every priced item is cosmetic.

8.3 Growth. Five stages: seed, sprout, sapling, young, full. Costs are
cumulative and increasing — STAGE_COSTS = [5, 6, 7, 8], giving thresholds
at 5, 11, 18 and 26 total logs. Entries and photos both count. Growth
visibly slows as a tree gets larger.

8.4 Decay. Thresholds as in §5.2. The clock counts days since the most
recent of: a journal entry, a photo, a revival, or — for a tree with no
logs at all — the day it was planted.

8.5 Rest days. One missed day per rolling 7-day window is bridged rather
than fatal. Rest days are not counted into the streak number; they only
keep the chain connected. Two misses inside the window break it. A rest
cannot bridge a gap before the streak has a logged day to protect, so two
consecutive silent days ends a streak outright.

8.6 Revival. REVIVE_COST = 20, sets revived_at, resets the clock, fails
cleanly when unaffordable.

8.7 Open design risk. The decay mechanic is intended to motivate, but it
cannot distinguish a student who lost interest from one who had exams, was
ill, or had a hard week at home. Nothing in the app knows the difference,
and a dead tree may read as punishment rather than a prompt. This is the
largest unvalidated product assumption in the system (§14.7).


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
  Freeform hobby names are filtered before they can become a tree.
  All social surfaces are scoped to a class, or to accounts that opted into
    being findable. No cross-class discovery exists.

9.2 How visibility is actually enforced

  Every rule below is an RLS policy in Postgres. The client is not trusted
  with any of it, and a hand-written request with the anon key gets the
  same answers the app does.

  users_select      own row; or discovery_enabled = true; or same
                    class_code as the requester — and in both of the latter
                    cases, no block row in either direction.

  interests_select  own rows; or the owner is discoverable or a classmate,
                    and no block in either direction.

  entries_select    own; or the parent interest is visible and the entry
  photos_select     itself is public. Both subquery interests, which is
                    itself under interests_select, so a block hides a
                    person's entries and photos for free.

  watches_*         own rows only. Insert additionally requires the target
                    interest to exist, which RLS filters through
                    interests_select — so a student can only watch a hobby
                    they can already see, and that stays true as the
                    visibility rules change.

  reports_*         insert own, select own. No update policy for anyone.

  storage           both buckets: a file is readable if it is in the
                    requester's own folder, or if its row is visible under
                    the rules above.

9.3 Privilege boundaries

  Two columns on users must not be self-assigned, and users_update_self is
  deliberately broad because it is how every ordinary profile edit works.
  They are therefore frozen by a BEFORE UPDATE trigger rather than by
  narrowing the policy:

    account_type   decides whether the app renders the educator dashboard.
                   Set once at signup from auth metadata, in
                   handle_new_user, before the trigger applies. Any later
                   change raises.

    class_code     changeable only inside join_class(), which sets a
                   transaction-local flag the trigger reads. A direct
                   write raises.

  The classes table is readable only by its owner. A class code cannot be
  discovered by listing the table; it has to be handed to the student. This
  closes a hole in which any signed-in account could read every code, write
  one into its own row, and then read the full roster — names, avatars and
  bios — of a class it was never in.

9.4 Report and block

  Reachable from wherever the thing is actually looked at: a user's
  profile, a public tree, a photo in the viewer, an individual journal
  entry, and a feed post. Not from a settings screen.

  Both act optimistically — the item disappears, then the request goes —
  because making a child wait on a network round-trip to stop seeing
  something they just reported is the wrong order.

  Blocking needs no further wiring: the RLS policies above already consult
  blocks, so inserting the row is sufficient to hide both directions.

9.5 What is missing. Reports can be filed and nobody can read them. See
§14.1 — this is the most serious open item in the product.


--------------------------------------------------------------------------
10. TECHNICAL ARCHITECTURE
--------------------------------------------------------------------------

10.1 Stack

  React 18, Vite 7, React Router 7, Supabase JS 2, Dexie 4.
  No UI framework, no CSS framework, no state library. State is three React
  contexts: AuthContext, StoreContext, UIContext, plus I18nContext.

10.2 Routes

  /                                      garden, or educator dashboard
  /interest/:id                          own tree
  /user/:userId/interest/:interestId     someone else's tree
  /explore
  /profile
  /market
  *                                      redirect to /

  Sheets are not routed. They are UIContext state layered over whatever
  route is current, which is why returning from a public tree has to
  explicitly reopen the sheet it was opened from — history alone does not
  remember it.

10.3 Bundle

  Route-level code splitting; AuthFlow and HomeScreen stay eager because
  one of them is always the first paint. Vendors are split by what changes
  together.

    vendor-supabase   213 kB   56 kB gzip
    vendor-react      180 kB   59 kB gzip
    vendor-dexie       97 kB   32 kB gzip
    index             109 kB   39 kB gzip
    index.css          58 kB   11 kB gzip

  Deferred behind a tap: SheetHost (27 kB), ExploreScreen, Onboarding,
  InterestScreen, ProfileScreen, PublicInterestScreen, MarketScreen,
  EducatorDashboard, PhotoViewer.

10.4 Storage and offline

  IndexedDB via Dexie, four stores: meta, interests, entries, photos.
  Chosen over localStorage specifically because localStorage cannot hold
  binary blobs and caps around 5 MB, which rules out photos and audio.

  PWA: manifest plus service worker, registered in production only.

10.5 Media handling

  Photos are capped at MAX_PICK_BYTES = 25 MB before decode, scaled so the
  long edge is at most 1600 px, and always re-encoded to JPEG at quality
  0.82 on a canvas with a white matte behind it. The re-encode is
  unconditional: anything reaching Storage has been decoded by the
  uploader's browser and re-emitted, which is what guarantees other
  browsers can read it. A file that fails to decode is rejected with a
  message rather than uploaded as-is.

  Voice notes are recorded in-browser and uploaded to the voice-notes
  bucket with the entry's id as the filename.

10.6 Error handling

  A root error boundary wraps the providers, since a crash inside a context
  is exactly what it exists to survive. A second per-route boundary, keyed
  on pathname, means one crashed screen does not take the tab bar with it
  and switching tabs clears it.

  Supabase error codes handled explicitly: 23505 unique violation (taken
  username, already blocked, already watching — several of which are the
  state the caller wanted anyway), PGRST204 unknown column (drives the
  schema-drift retry in §7.8), 42703 missing column (an unapplied feed
  migration returns an empty feed rather than crashing), 42501 raised by
  the privilege triggers.

10.7 Tests

  Vitest, 70 tests, run under a fixed TZ=Asia/Singapore because the date
  bug they guard against is invisible in UTC.

    derived.test.js    streaks and the rest-day rule at every boundary
    tree.test.js       growth thresholds and health transitions, tested at
                       the boundaries rather than sampled between them
    dates.test.js      local-date keys, leap days, year boundaries
    syntheticEmail     determinism and the documented collision

  Coverage stops at pure logic. Nothing tests RLS, sync, or any component.

10.8 Deployment

  GitHub Pages via GitHub Actions, with a 404.html redirect so client-side
  deep links survive the absence of server-side rewrites.


--------------------------------------------------------------------------
11. LOCALIZATION
--------------------------------------------------------------------------

373 string keys, each an [en, zh] pair. Two are intentionally identical
across languages. Coverage includes UI copy, onboarding, error messages,
all 39 hobby ideas and their descriptions, all 7 category labels, and the
community captions — not only the chrome.

The toggle is present in nearly every top bar and applies immediately to
content already rendered. Chinese is a native target, not a translation
layer over an English product.

Hobby names have both an English and a Chinese form, and "do I already have
this hobby" matches on either, so a student switching languages does not
appear to lose their trees.


--------------------------------------------------------------------------
12. BUILD STATUS
--------------------------------------------------------------------------

12.1 Live and real

  Accounts and auth. Sync, with retry and a visible stuck state. Classes,
  class codes and rosters. User search. The community feed. Photo and
  voice-note storage. Coins, purchases and the market. Report and block
  across all four target types. Watching a hobby. Account deletion.
  Recently Deleted. Badges, Year in Review, Memories, growth replay,
  seasons, rest days.

12.2 Fixture data, remaining

  One place only: the demo classmate cards in StudentSheet, which use the
  STUDENTS constant. The educator roster and the School tab are live
  queries. Do not read the fixture's continued presence as evidence that
  the roster is fake; an earlier revision of this document did exactly
  that and was wrong for weeks.

12.3 Removed deliberately

  The demo garden. The guided mascot tour. The export-my-data feature. The
  per-tree visibility toggle. The "who you do this with" field. The daily
  learning goal.

12.4 Migration history, 24 files

  20260723000000  multi-user schema: users, interests, entries, photos,
                  watches, blocks, reports, and all initial RLS
  20260723000001  table privileges
  20260724000000  unique display_name
  20260725000000  interest appearance columns
  20260824000000  classes table, per-educator codes, users.class_code
  20260824001    fix users_select recursion via a definer function
  20260825000000  tree visibility collapsed into account-level discovery
  20260828000000  photos Storage bucket and policies
  20260830000000  onboarding_completed
  20260830010000  photo storage update policy (renumbered from a collision)
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

  All 24 are applied to the live project as of 2026-09-12.


--------------------------------------------------------------------------
13. SUCCESS CRITERIA
--------------------------------------------------------------------------

None of these have been met, because none have been attempted with real
students. They are the bar, not a report.

13.1 The log-an-entry loop is under a minute on a real phone, measured from
a cold app open by an actual student, not estimated.

13.2 Decay reads as motivating rather than punishing across a multi-week
trial that includes at least one student having a genuinely bad week. If
the response to a dead tree is guilt rather than revival, the tuning is
wrong regardless of how it demonstrates in a short session.

13.3 A garden survives real conditions: closing the tab, losing wifi
mid-session, switching devices after signing in, and sharing a phone with a
sibling who has their own account.

13.4 At least one student uses it unprompted for more than a week and can
say in their own words what brought them back, or what stopped them.

13.5 Visibility is demonstrated, not asserted: show live that a private
entry is invisible to a second real account querying directly, not merely
hidden by the UI.

13.6 A report filed by a child is seen by an adult inside a defined window.
This is currently impossible (§14.1).


--------------------------------------------------------------------------
14. KNOWN LIMITATIONS AND OPEN QUESTIONS
--------------------------------------------------------------------------

Ordered by what stands between this build and real children using it.

14.1 No moderation queue. BLOCKER.
  Reports can be filed from five surfaces. Nobody can read them. The
  reports table has insert-own and select-own policies and no admin path,
  and there is no tooling in the repository. A child reports something and
  nothing happens; no adult learns that it happened. Needs a service-role
  backed view — RLS deliberately cannot expose this to a client — and,
  more importantly, a named person whose job is to read it. The
  service-role key must never reach the browser bundle.

14.2 No age gate, privacy policy, terms of service, or parental consent.
  BLOCKER. Nothing asks how old anyone is. COPPA (under 13, US) and
  GDPR-K (under 16, EU) both assume all four exist. The policy text must
  come from a lawyer. The age gate needs a product decision: what the
  cutoff is, what an under-age signup sees, whether a parent's email is
  collected, and what the account can do while consent is pending.

14.3 No account recovery. BLOCKER.
  Students have no email, so no reset link is possible, and no alternative
  mechanism exists. Educators have a real email and there is still no reset
  flow. A student who forgets their password loses their entire garden
  permanently, with no path back. This needs a mechanism decision —
  recovery codes issued at signup, teacher-mediated reset, or something
  else — before it can be built.

14.4 No data export.
  It existed and was removed deliberately (commits 8c1d3f7, f30247b).
  Erasure without portability satisfies half of what GDPR asks. No
  student, parent or teacher can obtain a copy of a garden before deleting
  it.

14.5 Account deletion depends on an unverified grant.
  delete_my_account() deletes from auth.users, a schema this project does
  not own — auth belongs to supabase_auth_admin. On a normal Supabase
  project the migration owner has the rights and this works, which is why
  it is the common pattern. If it does not, the failure is at runtime
  rather than at migration time: the function raises, the client reports a
  generic failure, and a legally required feature is broken while appearing
  implemented. Verify by deleting a throwaway account and confirming the
  auth row is gone. If it raises, move the deletion to an edge function
  using the service-role key and drop the SQL function rather than leaving
  it in place looking functional.

14.6 No automated image screening.
  Photos sync and are visible to classmates and to anyone the owner is
  discoverable to. Nothing inspects them. No EXIF stripping either, so
  location metadata embedded by a camera is uploaded as-is.

14.7 Decay tuning is unvalidated under real conditions.
  See §8.7. A product-design risk rather than a tuning task.

14.8 Test coverage stops at pure logic.
  70 tests cover streaks, growth, dates and the derived address. Nothing
  covers RLS, sync, or any component. RLS is where the real risk is, and it
  is the least tested thing in the system. The visibility rules are complex
  enough that §13.5 should be an automated test, not a manual check.

14.9 No error monitoring in production.
  A crash is discovered when a child tells a teacher. The per-route error
  boundary logs to the console, which nobody is reading.

14.10 No accessibility work beyond the basics.
  Images have alt text and 32 controls carry aria-labels, but there has
  been no screen-reader pass, and no larger-text option. Both sit open in
  the feature backlog.

14.11 Two dead columns.
  users.bio and users.default_visibility are read by nothing. Harmless, but
  they will mislead the next person reading the schema, exactly as
  interests.visibility did.

14.12 Naming drift.
  The app is Forest. The codebase still says "orb" in component and CSS
  names. This document was titled "Leaves" until this revision. One pass
  would stop new contributors inheriting the confusion.

14.13 Supabase migration history is not tracked by the CLI.
  There is no config.toml and no link file in supabase/. Migrations have
  been applied by hand through the dashboard SQL editor, so the project's
  own migration history table does not know about them. `supabase db push`
  will therefore disagree with reality the first time someone runs it.
  Worth reconciling before more than one person is applying migrations.


--------------------------------------------------------------------------
MAINTENANCE NOTE
--------------------------------------------------------------------------

The previous revision of this document described the classroom roster, the
community feed and photo storage as fixture-backed or absent, months after
each had shipped. It also described the watches table as existing four days
after it was dropped. Both errors came from reading the original schema
migration and not the later ones.

Every claim in this revision was checked against src/ and
supabase/migrations/ on 2026-09-12. Check it again rather than trusting it.
