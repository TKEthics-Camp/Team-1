# Product Requirements Document — "Orbs" (working title)

*A personal sanctuary for the things you love — and a window into what others love. Version 2.0 — competition build.*

---

## 1. Vision

Open the app and see everything you love laid out like the glowing memory orbs from *Inside Out*. Tap into any one — Watercolors, Piano, Basketball — and you enter a space to tend that interest: an album of what you've made, and a journal of the days you spent on it.

Each orb is yours to curate. You decide whether it stays **private** — a sealed room only you enter — or goes **public**, where it can be discovered by someone who has never tried watercolors and doesn't yet know they'd love it.

The app exists for two motions:

1. **Cultivate.** Remind you of everything you care about, so that when your attention drifts toward games or scrolling, you have a place that pulls you back to the real things you make.
2. **Discover.** Show you that other people are quietly cultivating things too — and let their orbs become the seed of your next interest.

It competes with instant gratification not by being louder, but by making real activity visible and contagious. The thesis in one line: *you are more than the thing that fills your idle minutes, and so is everyone else.*

---

## 2. Problem

People carry many interests they never get to cultivate, simply because it's easy to forget what you were even interested in. Low-effort dopamine — games, short video — fills the gaps by default.

There are two failures here, and v1 only solved the first:

- **You forget what you love.** There's no single, warm place holding all of it.
- **You never find out what you *could* love.** Interests spread by exposure — you see a friend playing guitar, you want a guitar. Most people's exposure surface is tiny, especially with fewer teachers, peers, and resources nearby. The feeds that *do* have reach optimize for consumption, not for making anything.

Existing social apps make you a spectator of other people's highlights. Orbs makes you a spectator for about eight seconds, then hands you a way to start your own.

---

## 3. Target user

**This is the single most important open decision in v2 — resolve it before writing auth code.** See §12, Q1.

The v1 doc framed the user as secondary-school students (13–18) in rural Jiangxi. That framing is still the right *emotional* target, but a public discovery surface populated by minors is a materially different product from a private notebook, legally and ethically. Two viable paths:

- **Path A — General audience, 16+ (recommended for a public build).** Same emotional pitch, no minor-safety architecture required beyond the standard. Demo it with student users; ship it open.
- **Path B — Teen product, built like one.** Keep 13–18. Then the safety design in §9 is not optional polish, it is a P0 feature set, and the realistic v1 is *sharing within a closed circle* (a class, a school, an invite code) rather than an open network.

Everything below is written to work under either path. Path B's extra constraints are marked **[B]**.

Common to both:

- Has a smartphone (personal or shared), sometimes a computer. Phone is primary.
- Has at least one interest they'd like to keep alive but struggle to sustain.
- Is *not* looking for another social network — no follower counts to chase, no performance. They want a home for their hobbies, with a door they control.

Mobile-first responsive web; works fine on desktop.

---

## 4. Goals & non-goals

### Goals (v2)

- Let a user create interests ("orbs") and see them all at a glance.
- Let a user add photos and journal entries inside each orb, in under 30 seconds.
- **Let a user set each orb to public or private, and change it at any time.**
- **Let a user discover public orbs from other people, and turn a discovery into an orb of their own.**
- Make progress feel visible and rewarding (streaks, a growing gallery, resurfaced memories).
- Keep the private half of the app fully functional even when discovery is off or offline.

### Non-goals — deliberately NOT built (write these down and let them go)

- **No direct messaging.** Not in v1, not in v2. This is the single highest-risk feature in any social app and it is not needed for the core value.
- **No follower counts, like counts, or public rankings.** Vanity metrics turn cultivation into performance, which is the exact failure mode we're replacing.
- **No infinite feed.** Discovery is a small, finite, daily set (see §6.3). If discovery can be doom-scrolled, we have built the thing we set out to fight.
- No nearby / location-based matching. Ever.
- No real-name profiles, no age or school fields, no contact details in profiles.
- **[B]** No comments or free-text replies between users in v1 — reactions only, if anything.
- No badges/points gamification.
- No hobby-news or English-learning page.
- No push notifications (stretch).

---

## 5. The core loops

There are now two loops. **The cultivate loop is the product; the discover loop feeds it.** If you only get one working, get the first one working.

### 5.1 Cultivate (primary)

Open → see your orbs plus one resurfaced memory → tap an orb → browse its album and journal → add a photo or entry in under 30 seconds → watch the gallery and streak grow.

**Hard quality bar: adding an entry or photo takes under 30 seconds.** Everything else serves that.

### 5.2 Discover (secondary, and deliberately short)

Open Discover → see a handful of public orbs, today's set → tap one → see what someone has actually made and a little of why they love it → **either "Start my own orb of this" (converts to the cultivate loop) or "Keep an eye on it" (a light save) → the set runs out.**

Design principle: **the discover loop must terminate in creating, not in more scrolling.** The set is finite by design. When it ends, the app says so and points you home. A user who ends a Discover session with a new empty orb is a success; a user who ends it having seen forty orbs is a failure, no matter how long they stayed.

---

## 6. Screens & features

Six screens.

### 6.1 Home (the orb view) — *your space*

- A soft cluster/grid of circular orb cards, each with a color gradient and gentle glow (gentle float animation if time allows).
- Orb face: name + most recent photo as background; falls back to the color gradient when empty. The home screen becomes a wall of your own creations.
- **A small, quiet visibility marker on each orb — public orbs glow slightly outward, private orbs have a soft closed ring.** No text labels; it should read as atmosphere, not administration. The user must be able to tell at a glance which of their orbs the world can see.
- "Resurfaced memory" banner at the top: one pinned or recent moment with a warm prompt ("Remember this?"). This is the emotional payoff and the thing that pulls users back.
- "＋ New interest" button.
- Empty state: friendly prompt to add your first interest, with 2–3 suggestions — **plus an entry point to Discover, since a brand-new user has nothing of their own to look at yet.**

### 6.2 Interest detail — *your orb*

- Header: orb name, color, "why I love this" line (editable), and **the visibility control**.
- **Visibility control.** A clear two-state toggle: *Private* / *Public*. Changing to public shows a plain-language confirmation of exactly what becomes visible and what does not. Changing back to private takes effect immediately and removes the orb from all discovery surfaces. **Default for every new orb is Private.** Making something public is always a deliberate act.
- Two independent tabs, each with its own "＋ Add":
  - **Album tab** — photo grid. Add from camera or gallery. Tap to view full-size; long-press or menu to delete. No text or date required.
  - **Journal tab** — dated entries, reverse-chronological. Tap to edit; swipe or menu to delete.
- **Sharing granularity — important.** Orb-level visibility governs the *album and the "why"*. **Journal entries are private by default even inside a public orb**, with a per-entry "share this one" toggle. The journal is where someone writes "I felt like giving up today." That must never be published by a toggle the user flipped for a different reason.
- Small streak/stat line ("12 photos · journaled 5 days this month"). **Private to you** — not shown on your public orb.
- Edit / delete the orb from a header menu.

### 6.3 Discover — *other people's orbs*

- **A finite daily set: 6–9 public orbs, refreshed once a day.** Presented as a slow drift of orbs, not a scrolling list. When the set is exhausted: a gentle end card ("that's everything for today") with a button back Home.
- Each card shows: orb name, its color, 1–3 photos, the owner's display name and avatar, the "why I love this" line. Nothing else. No counts, no timestamps that create urgency.
- Filters, if time allows: a few broad categories (Making, Music, Movement, Words, Growing things). Not a search box in v1 — search invites looking for *people*, and this is a place to look for *interests*.
- **Two actions per orb, and only two:**
  - **"Start my own"** — creates a private orb in your space pre-named after the interest, with the source noted ("inspired by Lin's Watercolors"). This is the money action. It is the reason Discover exists.
  - **"Keep an eye on it"** — a light save. Saved orbs surface occasionally on Home ("Lin added something to Watercolors"). Cap it: **a user can keep an eye on at most ~20 orbs**, so it never becomes a feed.
- **No follow-the-person primitive.** You follow *interests*, never people. This is a product decision as much as a safety one: it keeps attention on the thing being made rather than the person making it.

### 6.4 Public orb view — *someone else's orb, opened*

- Read-only version of the Interest detail: name, color, "why", shared photos, shared journal entries.
- Owner's display name + avatar, tappable to their public space (§6.5).
- Actions: "Start my own", "Keep an eye on it", and **"Report"** (always present, always one tap from the content).
- **No comment field. No message button. No reaction beyond an optional single quiet "this is lovely" tap** that the owner sees only as an aggregate count in their own private stats. If reactions add build risk, cut them — the product survives fine without them.

### 6.5 Public space — *someone else's wall*

- Shows only that person's **public** orbs, their display name, avatar, and a one-line bio. **Private orbs are absent — not greyed out, not counted, not hinted at.**
- No stats, no join date, no activity graph, no follower count.
- Report button.

### 6.6 Profile — *you*

- Avatar (chosen color or emoji is fine — no upload needed), display name, one-line bio.
- **"How I appear to others"** — a preview of your own public space exactly as a stranger sees it. Cheap to build, and it does more for user trust than any privacy policy.
- Private activity summary: number of interests, total entries, total photos, current streak.
- Settings: default visibility for new orbs (default: Private), discovery on/off (**a user can turn Discover off entirely and use the app as the v1 private notebook**), blocked users, clear all data, (stretch) export my data.

---

## 7. Data model

Objects that belong to a user, plus the join tables that make discovery work.

### users

| field | type | notes |
|---|---|---|
| id | string (uuid) | primary key |
| displayName | string | not a real name; no uniqueness pressure |
| avatar | string | color or emoji key |
| bio | string | optional, short, one line |
| discoveryEnabled | boolean | false disables Discover entirely for this user |
| defaultVisibility | string | `private` \| `public`; ships as `private` |
| createdAt | number | timestamp |

### interests

| field | type | notes |
|---|---|---|
| id | string (uuid) | primary key |
| userId | string | owner |
| name | string | e.g. "Watercolors" |
| color | string | gradient/theme key |
| why | string | "why I love this", optional; **public when the orb is public** |
| **visibility** | string | `private` \| `public`. Default `private` |
| **category** | string | optional, from a fixed list; powers Discover filters |
| **inspiredBy** | string | optional interest id, set by "Start my own" |
| createdAt | number | timestamp |
| updatedAt | number | timestamp |

### photos

| field | type | notes |
|---|---|---|
| id | string (uuid) | primary key |
| interestId | string | which orb it belongs to |
| blob / storageUrl | Blob or URL | local blob offline, object-storage URL when synced |
| caption | string | optional |
| isPinned | boolean | shows in "resurfaced memory" |
| createdAt | number | timestamp |

Photos inherit their orb's visibility. Simple, and it matches what users expect from an album.

### entries

| field | type | notes |
|---|---|---|
| id | string (uuid) | primary key |
| interestId | string | which orb it belongs to |
| date | number | the day being journaled (user-set) |
| text | string | the entry |
| **isShared** | boolean | **default false, even in a public orb** |
| isPinned | boolean | shows in "resurfaced memory" |
| createdAt / updatedAt | number | timestamps |

### watches ("keeping an eye on")

| field | type | notes |
|---|---|---|
| id | string (uuid) | primary key |
| userId | string | the watcher |
| interestId | string | the watched orb |
| createdAt | number | timestamp |

Note the shape: **a watch points at an interest, never at a user.** There is no `follows` table. That absence is the safety design.

### reports

| field | type | notes |
|---|---|---|
| id | string (uuid) | primary key |
| reporterId | string | |
| targetType | string | `interest` \| `photo` \| `entry` \| `user` |
| targetId | string | |
| reason | string | from a fixed list |
| status | string | `open` \| `actioned` \| `dismissed` |
| createdAt | number | timestamp |

### blocks

`(userId, blockedUserId)`. A block hides that user's orbs from Discover and their public space, in both directions.

**Derived, not stored:** orb face photo (newest photo), streaks (from entry dates), counts, the daily Discover set.

---

## 8. Tech stack & architecture

**The honest headline: v1's "no backend, no accounts, no network" is gone.** Discovery requires other people's data, which requires a server, accounts, hosted images, and moderation. This is the real cost of the social pivot and it roughly doubles the build. Plan for it deliberately.

- **Framework:** React + Vite.
- **Backend:** **Supabase** (Postgres + auth + object storage + row-level security in one). Its row-level security is the right primitive here — visibility rules live in the database as policies, not in UI code that can be forgotten. Alternative: Firebase. Do not hand-roll auth.
- **The rule that matters:** *the client must never be the thing that decides what is public.* A policy on the `interests` table gates every read. If the RLS policy is right, a bug in a React component cannot leak a private orb.
- **Local-first storage:** keep **IndexedDB via Dexie.js** as the local layer. Your own orbs are written locally first and sync up; the app stays fully usable offline for the cultivate loop. Do not use localStorage (≈5 MB cap, can't hold blobs).
- **Photos:** `<input type="file" accept="image/*" capture>`; **downscale to ~1600px on the long edge and strip EXIF before storing or uploading** — EXIF carries GPS coordinates, and publishing those with a teenager's photo is exactly the failure we are designing against. Render with `URL.createObjectURL(blob)`, revoke on unmount.
- **Routing:** React Router — `/`, `/interest/:id`, `/discover`, `/orb/:id` (public), `/u/:id`, `/profile`, plus modals.
- **Styling:** Tailwind or CSS modules. Soft, warm, glowing: rounded, gradients, generous spacing.
- **PWA (optional polish):** manifest + icon for "add to home screen". Small change, big "it feels like a real app" payoff.

### Suggested component structure

```
App (router, bottom nav: Home · Discover · Profile)
├─ HomeScreen
│  ├─ MemoryBanner          (resurfaced pinned/recent moment)
│  ├─ OrbGrid → OrbCard     (name + latest photo, visibility ring)
│  └─ AddInterestModal
├─ InterestScreen           (own orb)
│  ├─ InterestHeader        (name, "why", VisibilityToggle, edit menu)
│  ├─ Tabs
│  │  ├─ AlbumTab   → PhotoGrid, PhotoViewer, AddPhotoSheet
│  │  └─ JournalTab → EntryList, EntryEditor (per-entry share toggle)
├─ DiscoverScreen
│  ├─ DailySet → DiscoverOrbCard
│  └─ EndOfSetCard
├─ PublicOrbScreen          (read-only + StartMyOwn, Watch, Report)
├─ PublicSpaceScreen
├─ ProfileScreen            (incl. "How I appear to others")
└─ shared: Modal, Button, BottomNav, EmptyState, ReportSheet
   data layer: db.js (Dexie local) + api.js (Supabase, RLS-backed)
```

**Known risks to note in your write-up:**

1. Local browser storage can be cleared, losing unsynced data. Sync mitigates this for account holders; JSON export remains a good stretch feature.
2. **A single wrong visibility check publishes a child's photo album.** Mitigated by putting the rule in RLS rather than the client, defaulting to private, and the "How I appear to others" preview. Say this out loud in the write-up — judges reward teams who can name their own scariest failure mode.

---

## 9. Safety & trust design

This section exists because §4 of the v1 document ruled discovery out of scope on child-safety grounds. That concern was correct, and adding discovery doesn't dissolve it — it means the concern has to be answered in the design. **Under Path B this is P0 work, not polish.** Under Path A it's still the right default.

**Structural choices (these do most of the work):**

- **No DMs, no comments, no free-text between users.** The overwhelming majority of harm in teen social products flows through private or semi-private text channels. There isn't one here to abuse.
- **You watch interests, not people.** There is no way to accumulate an audience, and no way to find a specific person unless they gave you their name outside the app.
- **Private by default, everywhere.** New orbs, new journal entries, new accounts.
- **No location, no age, no school, no real names, no contact fields.** Not collected, so not leakable. EXIF stripped from every image.
- **[B] Closed-circle sharing as the realistic v1 shape:** an invite/class code scopes discovery to a known group. Ships the whole emotional payload of discovery with a fraction of the risk, and is far more demoable than an empty open network — a new social app's real problem on day one is that Discover is empty anyway.

**Operational necessities (unglamorous, non-optional if this ever has real users):**

- Report on every piece of public content, one tap away, with a visible outcome.
- Block, bidirectional and immediate.
- A moderation queue someone actually reads, plus the ability to unpublish an orb server-side.
- Automated image screening on upload before anything becomes public (Supabase can call out to a moderation API).
- Terms and a plain-language privacy note; **[B]** parental-consent handling wherever the jurisdiction requires it.

**A note for the write-up:** if this is a student competition build with a public deployment, the honest position is that Path B without the operational half of this list is not shippable to real minors. Building it as a closed-circle demo, and *saying* that's why, is a stronger answer than pretending the risk isn't there. Judges reward teams who understand the consequences of their own product.

---

## 10. Build plan (phased — build in this order)

The ordering principle is unchanged and matters more now that scope has grown: **the private app must be complete and lovable before the social layer starts.** An app that only works when other people are using it has nothing to show on day one.

- **Phase 0 — Setup.** Vite + React + Router + Dexie schema + styling system. Blank app routing between empty screens.
- **Phase 1 — Interests skeleton.** Create/edit/delete interests. Home shows orbs as colored cards. Tapping opens the (empty) detail screen. Walking skeleton of the whole loop.
- **Phase 2 — Journal.** Add/edit/delete dated entries. Reverse-chronological list.
- **Phase 3 — Album.** Photo capture/upload, blob storage, grid, full-size viewer, delete. Downscale + strip EXIF on save.
- **Phase 4 — The soul.** Orb faces show the latest photo; resurfaced-memory banner; pinning; streaks/stats; polished empty states; float/glow animation.

> **Milestone rule: Phases 0–4 must be fully working and demo-ready before Phase 5 begins.** If the deadline arrives here, you have the v1 product, complete. That is a win. A half-built social layer on a half-built app is a loss.

- **Phase 5 — Accounts & sync.** Supabase auth, push local data up, RLS policies written and *tested by trying to read another user's private orb directly against the API*. Do this before any public UI exists.
- **Phase 6 — Visibility.** The public/private toggle, per-entry sharing, the visibility ring on Home, "How I appear to others". Still no discovery surface — you're just making the concept of public real and verifiable.
- **Phase 7 — Discovery.** Discover screen with the daily set, public orb view, public space, "Start my own", "Keep an eye on it".
- **Phase 8 — Safety.** Report, block, moderation queue, image screening. **Ships in the same release as Phase 7, never after it.**
- **Phase 9 — Frame it.** Profile polish, in-app nudge on open, PWA manifest + icon.
- **Stretch:** orb floating physics, JSON export/import, categories/filters in Discover, quiet reactions.

---

## 11. Success criteria (competition lens)

Judges reward clear problem → specific user → a working core → evidence it helps, told in a tight demo.

- The 30-second cultivate loop works flawlessly on a phone, live.
- **The discovery loop demonstrably ends in creation.** The metric that matters, and the one to quote on stage: *of users who opened Discover, how many started an orb of their own?* Not time spent. Not orbs viewed. If you instrument one thing, instrument this.
- **Visibility is provably correct.** Be able to show, live, that a private orb is invisible from a second account. This is a 20-second demo beat that earns enormous trust.
- One real user quote. Get 2–3 target students using it for a few days; a single honest reaction beats any feature.
- Emotional resonance — the orb wall and resurfaced memory should make someone smile.

### Suggested 90-second demo script

1. Open to a warm wall of orbs — "everything this student loves." One orb glows outward: it's public. (10s)
2. Resurfaced-memory banner recalls a watercolor from last week. Tap into Watercolors → growing album, journal streak. (20s)
3. Add today's entry + a photo, live, under 30 seconds. (20s)
4. Open Discover: a few orbs from other people. Someone's bonsai. Tap "Start my own" — and it's now sitting on your home wall, waiting. (25s)
5. Close on the problem and the one user quote: *"I keep opening it instead of the game."* (15s)

Note the shape of beat 4 — the demo ends with the user **making something**, not consuming. That's the whole argument of the product, delivered in five seconds.

---

## 12. Open questions to resolve as you build

1. **Age range and network shape (blocking — decide first).** Path A (16+, open network) or Path B (13–18, closed-circle sharing via class/invite code)? This determines auth, moderation load, and legal footing. Recommendation: **Path B with closed circles for the competition build**, since it keeps the target user, makes Discover non-empty on day one, and is defensible on stage.
2. **Cold-start.** An empty Discover kills the second loop. Options: seed with the team's own real orbs, run the demo inside one school's circle, or hand-curate the first daily sets. Pick one and build for it.
3. How is the daily set chosen? Recommendation for v1: random among public orbs with ≥3 photos, excluding your own and blocked users, weighted slightly toward categories you don't already have. No ML.
4. Are quiet reactions worth the build, or is "Start my own" enough signal for an owner? (Leaning: cut them for v1.)
5. Fixed palette vs. custom orb colors — recommend a curated 8–10 gradients.
6. Is pinning worth the UI, or should "resurfaced memory" just pull a recent moment automatically?
7. Localization: is the UI in Chinese? (Recommended for the target users; English copy above is placeholder.)