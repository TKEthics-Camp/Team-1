Product Requirements Document — "Leaves" (叶子)
A private garden that grows from what you actually do — one tree for every interest you keep alive, planted for a rural-China classroom and built to work for anyone.


1. Vision
Open the app and see a garden. Every tree in it is something you love — Piano, Basketball, Watercolors — and every tree only grows because you actually went and did the thing. Log ten minutes of practice, water the tree. Skip too many days, the tree wilts, and eventually dies. Bring it back to life if you want to, but it costs you something to do it.

The garden is private by default. Nobody sees it unless you decide, tree by tree, that they can. Next to the garden sits a second world — Explore — where a student can see hobby ideas curated for them, watch other students in their class light up a web of shared interests, and (if their teacher set them up with an account) post to a small, low-stakes community feed. A student earns coins for logging real activity and spends them on hair, outfits, and hobby badges for their avatar — the only thing money buys in this app is you, cosmetically, never an advantage or a shortcut around the core loop.

It competes with a phone's default gravity — games, short video — not by matching their loop-closing tricks beat for beat, but by pointing the same mechanics (streaks, unlocks, a small reward waiting for you) at things a student actually made or practiced in the real world.
2. Problem
Two problems, not one:

Motivation decays faster than interest does. A student picks up a hobby, does it for two weeks, and then life gets busy — homework, a slow week, no one around to practice with — and the habit quietly dies. Nothing in their day reminds them the hobby (or their progress in it) still exists.
Rural students have a thinner support structure for sustaining a hobby. Fewer teachers who can specialize in a given interest, fewer peers doing the same thing, less disposable income for lessons or equipment, and long unstructured hours that default to a phone. The gap between "wants to keep doing this" and "actually does" is wider here than it is for a well-resourced student.

Low-effort dopamine (games, short video) is not the enemy exactly — it's just winning by default because it's frictionless and immediately rewarding. This app's bet is that if real activity is made just as frictionless to log and just as immediately rewarding to see grow, it can compete for the same idle attention.
3. Target users & account types
Two account types exist in the product today, and they are not symmetric — they are two different apps sharing a shell.
3.1 Individual / student account
Age range: secondary-school students, roughly 13–18.
Originally framed for rural Jiangxi students specifically; nothing about the product requires that context, and it works as a general hobby tracker for anyone.
Primary device: phone, shared or personal. The app is mobile-first responsive web.
Has, or wants, at least one hobby they'd like to keep alive but struggle to sustain without a nudge.
Lands on their own Home — the garden.
3.2 Org / educator account
A teacher or school running a class.
Does not get a garden. Their Home is a dashboard: a class code to hand out, a roster, and rollup stats.
Skips the parts of onboarding that only make sense for a student logging their own hobbies (no gender/avatar-hairstyle question, no "pick your first interests," no reminder schedule).
A class code is minted automatically for them at the end of onboarding, rather than typed in.
3.3 How the two connect
A student can join a class by entering a class code (via a "Join a class" flow reachable from their profile, or during onboarding). Once joined, their profile carries a classCode, which unlocks the School tab in Explore — a web of classmates and shared hobbies — and surfaces them (in the current build, via fixture data) on the educator's roster. Today the classroom "roster" and "classmates" are represented by a fixed demo dataset (STUDENTS — six named students with pre-set hobbies), rather than live data from other real accounts; the class-code check itself is a static allow-list rather than a real per-teacher registry. This is flagged explicitly under Known limitations (§14) — the feature scaffolding for a real classroom social graph exists, but it isn't wired to live multi-account data yet.
4. Goals & non-goals
Goals (current build)
Let a student create interests ("trees") and see them all at a glance, as a garden.
Let a student log real activity against an interest — a journal entry with a duration, a photo, or both — in well under a minute.
Make the consequence of not showing up visible: a tree that isn't tended visibly wilts, and can die. This is the product's central point of difference from a plain streak counter — neglect has a visible cost, not just a broken number.
Reward real logging with a light in-app currency (coins), spendable only on cosmetics (avatar hair/outfit, hobby badges) — never on anything that changes the core loop's difficulty or outcome.
Let a student mark an interest, or an individual journal entry, as public — visible inside their class's Explore surfaces — while keeping everything private by default.
Give a student low-stakes ways to find their next interest: curated hobby ideas, a view of what classmates are into, and (optionally) a small community feed.
Give a teacher a zero-setup way to stand up a class: one code, a dashboard, nothing else to configure.
Work reliably offline for the core loop (garden, logging, avatar) via local-first storage, with best-effort background sync to an account once signed in.
Support English and Chinese as first-class, toggle-anytime languages throughout the entire product, including all curated content (hobby ideas, captions, UI copy).
Non-goals — deliberately not built, and not planned near-term
No direct messaging, no comments, no free-text reply between users. The riskiest feature class in any product aimed at minors, and not required for the value the app delivers.
No follower counts, public leaderboards, or like counts visible to others. Coins and cosmetics are a private-to-you reward loop, not a public performance metric.
No infinite feed anywhere. Explore's community tab and the school web are both small, finite, low-frequency surfaces — nothing here is built to be scrolled for more than a minute or two.
No real location, no age field, no school-identifying data, no contact details collected or shown in any profile.
No push notifications that require a server. Reminders today are local, in-browser, opt-in notification prompts tied to a tree's own schedule — not a backend notification service.
No pay-to-win mechanic of any kind. Coins only ever buy appearance. This is a hard line, not a v1-vs-v2 scoping decision.
No public global discovery across schools/classes. Whatever social surface exists is scoped to "your class," never "everyone using the app."
5. The core loops
There are three loops layered on top of each other. The first is the product. The second and third exist to feed it.
5.1 Cultivate (primary loop)
Open → see your garden, each tree at whatever health it's actually at → tap a tree → see its "why," its recent photos/entries, its streak → log today's activity (photo and/or journal entry, with a duration) in well under a minute → watch the tree's growth stage and health respond, and earn coins.

Hard quality bar carried over from the product's origins and still true today: logging activity must be fast. A student who has to fight the UI to record five minutes of piano practice will simply not do it on a day when they only have five minutes.
5.2 Tend (the stakes loop — new relative to a plain photo-journal app)
Every tree has a schedule (which days of the week the student intends to work on it) and a health state derived from how recently it was actually logged against that schedule. Miss the schedule for long enough and the tree visibly wilts; miss it for longer and it dies. A dead tree can be revived by spending coins, which both restores it and resets its decay clock.

This loop is what makes the garden feel alive rather than decorative — the absence of activity is visible, not just its presence. It is also the loop that has to be tuned most carefully: too punishing and it becomes a source of guilt rather than motivation (a known risk, see §14); too forgiving and it stops mattering.
5.3 Discover (secondary, deliberately small)
Open Explore → see a short list of hobby ideas (some personally recommended based on interests the student doesn't have yet, some just a shuffled sample of the full curated list) → optionally see a web of classmates and what they're each into, if the student is in a class → optionally post to, or read, a small community feed, styled anonymous-by-default → tap an idea to see a description → start a new tree from it.

Design principle carried from the product's own internal safe-note copy: Explore is scoped to be a finder, not a feed. Nothing in it is designed to be scrolled indefinitely; it's designed to end in either "I'll try that" or "nothing today," both fine outcomes.
6. Screens & features
6.1 Home — the garden (individual accounts)
A grid/cluster of tree cards, one per interest, each rendered at a growth stage and health state derived from its logging history (see §7.2 and §8).
A resurfaced memory banner at the top — a warm prompt pulling back a past photo or entry ("Remember this?"), the emotional hook that's meant to pull a student back into the app on days they weren't planning to open it.
A nudge banner — separate from the memory banner — surfaces something more actionable: a tree that's close to wilting, or a reminder that today is one of a tree's scheduled days.
"＋ New interest" entry point to add a tree.
Empty state: for a brand-new student with no trees yet, a friendly prompt with a small number of suggested starter interests, plus a path into Explore.
Demo garden: a one-tap, clearly-labeled sample garden (DemoGardenCard) a student can plant to see what an established garden looks like — several trees at different stages, a streak already going — without touching their real data. It can be removed as a single unit (removeDemoGarden), is excluded from reminders/notifications, and is never synced to the account, so trying it can't corrupt or leak into real data.
The mascot tour (MascotTour) runs once, automatically, for any profile that hasn't seen it yet (tourSeen), walking a new student through the main surfaces.
6.2 Home — dashboard (org/educator accounts)
No garden; the educator's Home is the dashboard (EducatorDashboard).
Their class code, front and center, with a one-tap copy button.
Rollup stats: number of students, total hobbies logged across the class.
A roster list — tapping a student opens a read-only sheet (StudentSheet) showing that student's top hobby and hours.
In the current build, the roster is fixture data (STUDENTS in constants.js), not a live query against real student accounts under that class code — see §14.
6.3 Interest detail — a tree's page
Header: tree name, its color, its "why I love this" line (editable), and a visual growth-stage/species representation.
Visibility control for the tree as a whole: private or public. Public means the tree (and, unless overridden, its contents) can appear in the class's discovery surfaces; private is the default for every new tree.
Two independent tabs:
Journal tab — dated, reverse-chronological entries, each with a duration in minutes and optional text. Old entries created before duration-tracking existed are backfilled with a nominal 30 minutes so historical streaks/hours still compute sensibly.
Album tab — a photo grid; add from camera or gallery; tap to view full-size in a dedicated photo viewer; delete via long-press or menu.
Per-entry sharing is independent of the tree's own visibility — a journal entry has its own visibility field distinct from the interest's, so a student can keep a tree public (its "why," its photo album) while keeping a specific entry that says something more personal private. This mirrors the product's broader stance that public/private is a decision made at the smallest sensible unit, not inherited blindly downward.
A small streak/stat line, private to the owner.
A "friends" field on the tree, letting a student note who else (by name) they do this activity with — currently informational text, not a link to another account.
A reminder schedule — which days of the week this tree expects activity — editable from the tree's own edit sheet (OrbSheet), same schedule concept introduced at onboarding.
Header menu: edit or delete the tree. Delete is undoable via a toast for a short window before it commits for real (see §6.9).
A revive action appears once a tree has died from neglect, costing coins.
6.4 Public interest view — someone else's tree, read-only
Reached via /user/:userId/interest/:interestId, e.g. from the School web or a public profile.
Shows only what that owner made public: the tree's name, color, "why," and whichever photos/entries were individually shared.
No edit affordances, obviously — read-only.
6.5 Explore — three tabs, gated by account state
Ideas tab (individual accounts only — org accounts skip straight to a classmate web, since an educator isn't the one picking a hobby):
A personalized "For you" section: hobby ideas recommended based on categories adjacent to interests the student already has (e.g. already doing a sport → recommend another sport or a movement-adjacent hobby), with a short "because you..." reason shown to the student.
A full list of everything else, shuffled, with a reshuffle button and a search-adjacent absence — deliberately no search box, so this stays a place to browse ideas rather than look for people.
Ideas the student already has, or that already appeared in "For you," never repeat in the full list.
Every idea has a short plain-language description in both languages and belongs to one of seven categories (sport, art, music, mind, food, outdoor, dance/movement).
A user-search bar (UserSearch) sits above the tabs for any signed-in user, letting a student look up another user by display name — gated by that other user's own opt-in discoverable flag, enforced server-side by row-level security, not just hidden client-side.
Community tab: a small feed of posts (communityPosts, currently a fixture data source rather than live user-generated posts). A student chooses, for their own future posts, whether to appear anonymous or named — shown as a live preview of their own choice before they post. Other users' existing posts always render named, per PostCard. A persistent safety note is shown above the feed.
School tab (visible once a student has a class code, or always for org accounts): a radial web visualization — the student at the center, classmates arranged in a ring around them, with a connecting line drawn to any classmate who shares at least one hobby in common. Tapping a classmate opens a read-only sheet about them. Currently backed by the same fixture STUDENTS dataset as the educator dashboard, not live classmates.
6.6 Profile ("Me")
Avatar preview, name, account-level stats.
Avatar customization: skin tone and base hair/outfit colors are always free (identity shouldn't cost coins); additional hair and outfit styles beyond the free basics cost coins and are purchased/equipped from a dedicated sheet (AvatarSheet).
Language toggle (English/Chinese), affecting the entire app's copy, not just this screen.
Theme picker — eight named visual themes (Marshmallow, Sunset, Meadow, Ocean, Berry, Midnight, Dusk, Forest), each a distinct gradient/color identity applied app-wide via a data-theme attribute.
Username change flow (UsernameSheet), which checks availability server-side before committing locally — a taken name is rejected before the UI ever shows it as saved.
Discoverability toggle — opts the account in or out of appearing in Explore's user search. Off by default.
"Join a class" entry point (JoinClassSheet) for individual accounts that skipped it at onboarding.
Year-in-review (YearReviewSheet) — a retrospective recap of the student's activity, designed as a shareable, celebratory moment.
Entry point to the Market.
"Clear all data" — wipes local storage and, if signed in, the synced remote copy too (distinct from the local-only wipe that happens automatically on sign-out, see §7.4).
6.7 Market
Spends the coin economy. Grid of hobby-badge decorations (Piano, Painting, Basketball, Football, Guitar, Reading, Swimming, Cooking), each a colored/gradient ring plus an emoji badge, meant to visibly say "this is a piano kid," equippable on the avatar.
Owned-but-not-equipped items show an equip button; unowned items show their price and are disabled if the student can't afford them.
Coin balance shown persistently in the header.
6.8 Onboarding
A branching, multi-step flow (Onboarding.jsx) that differs meaningfully by account type:

Welcome — the pitch, shown to everyone.
Account type — individual vs. org/educator.
Gender (individual only) — used solely to pick a starting hair style default; never stored or shown as a demographic field elsewhere, and freely changeable afterward from the avatar editor. "Prefer not to say" keeps the shared default.
Name — display name, checked for availability server-side before onboarding can complete; a collision sends the student back to this step with an inline error rather than silently finishing with an unsaved name.
Interests (individual only) — pick a first set of trees to plant, with a content filter (isBlockedHobby) rejecting inappropriate free-text entries before they're allowed to become a real tree.
Schedule (individual only) — pick which days of the week each drafted tree expects activity, feeding directly into the tend/decay loop from day one.
Theme — pick one of the eight app-wide visual themes; the final step for everyone, and finishing it is what actually creates the account's profile and (for individuals) their first trees.

Org accounts skip gender, interests, and schedule entirely — none of the "plant your own hobby" steps make sense for someone who isn't logging their own activity — and go welcome → account type → name → theme. Their class code is minted automatically, not chosen.
6.9 Shared interaction patterns
Undo toast: destructive actions (deleting a tree, a photo, an entry) hide the item immediately but hold the real delete behind a short undo window (UndoToast), rather than committing instantly or requiring a confirmation dialog on every delete.
Sheets: nearly every "add/edit" interaction (entry, photo, tree, avatar, idea detail, joining a class, student detail, another user's profile, username change, year review) is a bottom sheet (SheetHost + individual sheet components) rather than a full page navigation — kept lightweight and fast to dismiss, in service of the "log something in under a minute" quality bar.
Language toggle is available from nearly every top bar, not buried in settings — switching is meant to be a one-tap, anywhere action.
7. Data model
7.1 users (remote, Supabase-backed)
field
type
notes
id
uuid
primary key, from Supabase auth
display_name
string
unique; chosen at onboarding, changeable later
account_type
string
individual | org
discovery_enabled
boolean
opts into Explore's user search; off by default
created_at
timestamp




The local profile record (Dexie meta store, key "profile") mirrors and extends this: name, lang, color, theme, accountType, classCode, coins, ownedDecorations, equippedDecoration, avatar (skin/hair/hairColor/outfit/outfitColor, plus owned-hair/owned-outfit lists), discoverable, tourSeen, createdAt, and a userId linking it to the signed-in account it belongs to (used to detect and prevent a second account's data bleeding into a shared device's local cache).
7.2 interests (a tree)
field
type
notes
id
uuid
primary key
userId
string
owner (local-only linkage; remote uses user_id)
name
string
e.g. "Piano"
why
string
optional "why I love this" line; public when the tree is public
color
string
palette key driving the tree's gradient
time
string
reminder time of day, e.g. "16:00"
days
array
which weekdays this tree expects activity — drives decay/health
species
string
optional cosmetic tree variant
leafColor
string
optional cosmetic override
friends
array of strings
freeform names of who else shares this hobby
visibility
string
private | public; default private
category
string
one of the seven Explore categories, when set
inspiredBy
string
optional id of the interest this one was inspired by
revivedAt
timestamp
set when a dead tree is revived; resets the decay clock
createdAt / updatedAt
timestamp



7.3 entries (a journal log)
field
type
notes
id
uuid
primary key
interestId
string
which tree it belongs to
date
string
the day being journaled
text
string
the entry itself, optional
minutes
number
duration logged; defaults to 30 for pre-existing rows that predate this field
visibility
string
independent of the parent tree's visibility; default private
isPinned
boolean
eligible for the "resurfaced memory" banner
createdAt / updatedAt
timestamp



7.4 photos (local-only, not yet synced)
field
type
notes
id
uuid
primary key
interestId
string
which tree it belongs to
blob
Blob
stored directly in IndexedDB via Dexie
caption
string
optional
isPinned
boolean
eligible for the "resurfaced memory" banner
createdAt
timestamp




Photos are the one object type that does not currently sync to the backend — they remain a local Blob only. This means a student's photo album does not survive a cleared browser cache or follow them to a second device, unlike their trees and journal entries. This is a known, explicitly-flagged gap (the sync code notes it needs object storage plus an upload/download path as a follow-up) — see §14.
7.5 Sync model
Local-first: every write lands in IndexedDB (via Dexie) first and immediately reflects in the UI; a signed-in session pushes interests and entries to Supabase in the background, fire-and-forget — a failed push is logged, not surfaced to the student, and the local copy stays authoritative until the next successful sync. On sign-in, a one-time reconciliation pass runs: local records not yet on the server get pushed (claimed under that account); server records not cached locally get pulled down (adopted) — covering both "used the app offline before creating an account" and "signing in on a second device." Signing out wipes the local cache (so a shared device doesn't leak the previous student's garden to the next person who signs in on it); the remote copy is untouched unless the student explicitly chooses "clear all data" from their profile.
7.6 Derived, not stored
Tree growth stage and health, streaks, hour totals, the daily-recommended Explore set, and the "resurfaced memory" candidate are all computed from the above at render/load time rather than persisted as their own fields.
8. The coin economy & decay system
This is the layer that most differentiates the current build from a plain photo-journal app, so it's worth documenting as its own section rather than folding it into "features."

Earning: every logged entry or photo earns a fixed number of coins (COINS_PER_LOG). This is the only way to earn coins — there is no other faucet (no daily login bonus, no ad-watching, nothing that decouples the reward from the activity it's meant to reinforce).
Spending: coins buy hobby-badge decorations for the avatar, and non-default hair/outfit styles. Every priced item is purely cosmetic. Nothing purchasable affects decay rate, reminder behavior, streaks, or how much a logged entry is worth.
Decay: a tree that goes unattended relative to its own schedule (days) moves through wilting states and can eventually "die." This is the mechanism meant to make neglect felt rather than just silently accumulating as a missed streak number.
Revival: a dead tree can be brought back to life for a flat coin cost (REVIVE_COST), which also resets its decay clock via revivedAt. Reviving fails cleanly (no state change) if the student can't afford it.
Design tension to watch, and actively manage: a decay mechanic that's meant to motivate can just as easily read as punitive to a student who missed a week because of exams, illness, or a hard week at home — a context the app has no way to know about. This is the single biggest product-risk item in the whole system and is treated as such in §14, not as a minor tuning note.
9. Social, discovery & safety design
The social surface here is intentionally much smaller and more constrained than a typical "discover" feature, in direct response to the target age group.

No direct messaging or comments anywhere in the product.
No follow-a-person primitive. The School tab links students by shared hobby, not by a follow relationship, and there's no way to accumulate an audience.
Community posts default to anonymous, and the choice belongs to the poster for their own content only — a student can't choose how someone else's post displays.
Discoverability is opt-in and off by default (discoverable flag), gating whether a student's account can even be found via search; enforced by backend row-level security, not just hidden in the UI.
Visibility is granular down to the individual journal entry, not just the tree — the product's explicit position is that a tree being public should never silently make everything under it public too.
A content filter runs on freeform hobby names at the point a student would create a tree from typed text (isBlockedHobby), rejecting inappropriate entries before they can exist anywhere in the app.
Class scoping: whatever social surface exists (School web, roster) is scoped to a class code, not to the whole app's user base — there is no cross-class or cross-school discovery today.
Explicitly out of scope, and treated as a hard line rather than a "not yet": DMs, public leaderboards, comments, location, real names, school-identifying fields, and any pay-to-win mechanic.

What's missing relative to a production-safe version of this social layer (see §14 for the full list): no report button, no block mechanism, no moderation queue, and no automated image screening on upload. The current community/school data is fixture-backed rather than live multi-user content, which is exactly why this gap hasn't bitten yet — but it is the first thing that needs to exist before the community tab or school web could safely carry real, unmoderated student-generated content and photos at any scale.
10. Tech stack & architecture
Framework: React 18, built with Vite.
Backend: Supabase (Postgres + auth + row-level security). RLS policies are the enforcement point for what's public — e.g. users_select restricts who a user search can return to the searcher's own row plus opted-in, non-blocked accounts; interest/entry visibility is similarly meant to be enforced at the database layer rather than trusted to the client.
Local-first storage: IndexedDB via Dexie.js, holding the full local cache of interests/entries/photos/profile — deliberately not localStorage, whose ~5MB cap and inability to store binary blobs would rule out the photo album entirely.
Routing: React Router — /, /interest/:id, /user/:userId/interest/:interestId, /explore, /profile, /market, plus modal/sheet state layered on top rather than routed.
Internationalization: a custom I18nContext with a full English/Chinese string table (strings.js) covering UI copy, onboarding, and every curated content item (hobby ideas, descriptions, captions) — language is a first-class, anytime-togglable setting, not a locale detected once at load.
PWA: web manifest + service worker (sw.js) present, enabling "add to home screen" behavior.
Deployment: GitHub Pages via a GitHub Actions workflow (deploy-pages.yml), with a 404.html redirect trick to make client-side deep links survive GitHub Pages' lack of server-side rewrites.
Reminders: browser Notification API, requested opt-in at the end of onboarding (askNotifications) and scheduled per-tree client-side (useReminderTimers) based on each tree's own day/time schedule — not a server-pushed notification.
Component structure (actual, current)
App (auth gate → Onboarding or routed shell; theme + reminders wired at the top)

├─ AuthScreen

├─ Onboarding (welcome → account type → [gender] → name → [interests → schedule] → theme)

├─ HomeScreen (individual)              │  EducatorDashboard (org)

│  ├─ MemoryBanner, NudgeBanner         │  ├─ class code + copy

│  ├─ OrbWall → Tree/Orb cards          │  ├─ Stats (students, hobbies logged)

│  └─ DemoGardenCard                    │  └─ roster → StudentSheet

├─ InterestScreen (own tree: header, visibility, AlbumTab, JournalTab)

├─ PublicInterestScreen (read-only, someone else's public tree)

├─ ExploreScreen

│  ├─ UserSearch

│  ├─ IdeasTab   → IdeaCard → IdeaSheet

│  ├─ CommunityTab → PostCard

│  └─ SchoolTab  → radial web → Avatar → StudentSheet

├─ ProfileScreen → AvatarSheet, UsernameSheet, JoinClassSheet, YearReviewSheet

├─ MarketScreen (decorations, coin balance)

└─ shared: BottomNav, Sheet/SheetHost, PhotoViewer, MascotTour, UndoToast, Stats, DayPicker, TopBar, LangToggle

data layer: db.js (Dexie schema) + store/StoreContext.jsx (all mutations, local+remote) + lib/remote.js (Supabase row mapping) + store/AuthContext.jsx
11. Localization
English and Chinese (Simplified) are both fully supported, including all curated content — every hobby idea, category label, and caption exists as an [en, zh] pair, not just the chrome around them. The language toggle is available from nearly every screen's top bar and takes effect immediately across the whole app, including content that was rendered before the switch. This reflects the target audience directly: the product is written to be used natively in Chinese, with English maintained as an equally real second language rather than a fallback.
12. Current build status vs. original phased plan
Earlier planning documents for this product (see PRD.md in the repo root, an earlier "Forest"-titled version) laid out a phased build order: skeleton → journal → album → "the soul" (growth stages, memory banner, streaks) → accounts & sync → visibility → discovery → safety → polish. Comparing that plan against the actual codebase today:

Substantially further along than the original plan assumed:

Accounts, auth, and Supabase sync are live, not a later-phase item.
Visibility exists down to the individual journal entry, which is a finer grain than the original plan called for.
A second account type (org/educator) exists and is not mentioned at all in the earlier plan.
A full coin/decay/revival economy and avatar customization system exist and were not part of the earlier plan's scope.
Two entirely separate discovery surfaces (Ideas and School) exist beyond the single "Discover" screen the earlier plan described.

Behind the original plan's stated bar for what "safety" requires before a social layer ships:

No report button, no block mechanism, no moderation queue, no automated image screening — all called out as prerequisites for shipping discovery/community features with real user-generated content, and none exist yet.
The classroom social graph (roster, School web) is fixture data, not live.
Photos don't sync — the "known risk" the earlier plan flagged (local storage can be lost) is materially true today specifically for the photo album, since it has no backend copy at all.
13. Success criteria
The core log-an-entry loop is fast on a real phone. This should be measured, not assumed — time an actual student adding a photo or journal entry from a cold app open.
Decay feels motivating, not punishing, over a multi-week real-world trial, including at least one student who has a genuinely bad week. If the reaction to a dead tree is guilt rather than "oh, let me revive that and get back to it," the tuning is wrong regardless of how the mechanic tests in a two-day demo.
A student's real garden survives real conditions: closing the tab, losing wifi mid-session, switching devices after signing in, sharing a device with a sibling who also uses the app under their own account.
At least one real student uses it unprompted for more than a week and can articulate, in their own words, what made them come back or what made them stop.
Visibility is provably correct: demonstrate, live, that a private tree and a private journal entry are genuinely invisible to a second account — not just hidden by the UI.
14. Known limitations & open questions
Ranked roughly by how much they matter before this could carry real, unmoderated content from real students at scale — not by how hard they are to fix.

No safety operations layer for social content. No report, no block, no moderation queue, no image screening. Fine today because the Community and School surfaces are fixture-backed; becomes the top priority the moment either surface carries live, unmoderated student content or photos.
Photos don't sync. They're local-only Blobs. A cleared cache or a second device silently loses the album, with no warning to the student that this could happen. Needs object storage (e.g. Supabase Storage) plus an upload/download path, and ideally EXIF-stripping and downscaling on upload (flagged as a best practice in the earlier planning doc but not yet implemented for any photo path).
The classroom social graph is fixture data, not live per-class rosters or a real class-code registry. The UI and interaction patterns (roster, radial web, shared-hobby lines) are built and working — what's missing is wiring them to real multi-student data per class, which is also a prerequisite for #1 to matter in practice.
Decay tuning is unvalidated with real students under real stress conditions (exams, illness, a bad week). This is a product-design risk, not just a numbers-tuning task — get this wrong and the app becomes a source of guilt rather than motivation, which is close to the opposite of the intended effect.
The class-code check is a static allow-list (CLASS_CODES in constants.js), not a real per-teacher-generated code system tied to actual educator accounts — an educator's own dashboard already shows their generated code, but a student joining doesn't yet validate against that specific code, just against the fixed list.
No moderation or review path for the freeform hobby-name filter's false positives/negatives — isBlockedHobby is a first line of defense, not a substitute for human review once real user-generated hobby names are flowing at any volume.
Export/backup of a student's data doesn't exist yet — "clear all data" exists, but there's no way for a student (or a parent, or a teacher) to get a copy of what's in the garden before it's gone.
Branding note: the shipped app title and copy call it "Leaves" (叶子), while the codebase's internal naming (interests, Orb/OrbWall, "orbs") still reflects an earlier tree-vs-orb naming decision. Not a functional issue, but worth a pass so internal naming matches the shipped metaphor before onboarding new contributors who'll otherwise reasonably assume "orb" means something different from "tree."


