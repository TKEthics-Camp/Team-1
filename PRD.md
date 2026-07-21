# Product Requirements Document — "Orbs" (working title)

*A personal sanctuary for the things you love. Version 1.0 — competition build.*

## 1. Vision

Open the app and see everything you love laid out like the glowing memory orbs from *Inside Out*. Tap into any one — Watercolors, Piano, Basketball — and you enter a private space to tend that interest: a photo album of what you've made, and a journal of the days you spent on it. The app exists to remind you of everything you care about, so that when your attention drifts toward games or scrolling, you have a place that pulls you back to the real things you love making.

It is single-player, private, and calm. There are no strangers, no feed, no notifications begging for attention. It competes with games not by being louder, but by rewarding real activity you did in the world.

## 2. Problem

People carry many interests they never get to cultivate, simply because it's easy to forget what you were even interested in. Low-effort dopamine — games, short video — fills the gaps by default. There's no single, warm place that holds all the things you love and gently reminds you they're there.

For the target users specifically (see below), the friction is higher: fewer teachers, peers, or resources to sustain a hobby, and lots of unstructured time that defaults to a screen. A private space that makes progress visible gives a reason to keep making real things.

## 3. Target user

Secondary-school students (roughly 13–18), initially framed for rural Jiangxi students, who:

- Have access to a smartphone (personal or shared) and sometimes a computer.
- Have at least one interest they'd like to keep alive but struggle to sustain.
- Are not looking for a social network — they want a personal, private home for their hobbies.

Primary device: phone. The app is mobile-first responsive web (looks and feels like an app on a phone, works fine on desktop too).

## 4. Goals & non-goals

### Goals (v1)

- Let a user create interests ("orbs") and see them all at a glance.
- Let a user add photos and journal entries inside each orb.
- Make progress feel visible and rewarding (streaks, a growing gallery, resurfaced memories).
- Work reliably offline, with no login and no server — a demo that never breaks.

### Non-goals — deliberately NOT built in v1 (write these down and let them go)

- No discover / nearby matching / connecting with strangers. (Child-safety and legal risk; out of scope entirely for a student build.)
- No public or global sharing feed.
- No badges / rewards gamification.
- No hobby-news or English-learning page.
- No user accounts, no cloud sync, no cross-device data (v2).
- No push notifications (v2 stretch).

## 5. The core loop

This is the entire product. If this loop feels good, the app works.

Open → see your orbs plus one resurfaced memory → tap an orb → browse its album and journal → add a photo or an entry in under 30 seconds → watch the gallery and streak grow.

The single most important quality bar: adding an entry or photo must take under 30 seconds. Everything else serves that.

## 6. Screens & features

Four screens total.

### 6.1 Home (the orb view)

- A soft cluster/grid of circular orb cards, each with a color gradient and gentle glow (and a gentle float animation if time allows).
- Orb face: the interest's name + its most recent photo as the background; falls back to the solid color gradient when there are no photos yet. The home screen becomes a wall of your own creations.
- A "resurfaced memory" banner at the top: one pinned or recent entry/photo shown with a warm prompt ("Remember this?"). This is the emotional payoff and the thing that pulls users back in.
- A "＋ New interest" button.
- Empty state: a friendly prompt to add your first interest, with 2–3 example orbs suggested.

### 6.2 Interest detail

- Header: orb name, its color, and a "why I love this" line (editable).
- Two independent tabs, each with its own "＋ Add" button:
  - **Album tab** — a photo grid. Add pictures directly (from camera or gallery). Tap a photo to view full-size; long-press or a menu to delete. No text or date required.
  - **Journal tab** — dated entries, reverse-chronological. Each is a line or two about a day you worked on the interest. Tap to edit; swipe or menu to delete.
- A small streak / stat line ("12 photos · journaled 5 days this month").
- Edit / delete the orb itself from a header menu.

### 6.3 Add / edit entry (and add photo)

- **Add entry:** date (defaults to today), a text field, a "pin as memory" toggle. Save.
- **Add photo:** native file/camera picker, optional one-line caption, a "pin as memory" toggle. Save.
- Both are lightweight modals or full-screen sheets — fast in, fast out.

### 6.4 Profile

- Avatar (a chosen color or emoji is fine for v1 — no upload needed), display name.
- A simple activity summary: number of interests, total entries, total photos, current overall streak.
- App info and a "clear all data" / (stretch) "export my data" option.

## 7. Data model

Three independent object stores. Everything "belongs to an interest"; nothing else references anything else. This is intentionally about as simple as a data model gets.

### interests

| field | type | notes |
|---|---|---|
| id | string (uuid) | primary key |
| name | string | e.g. "Watercolors" |
| color | string | gradient/theme key |
| why | string | "why I love this" note, optional |
| createdAt | number | timestamp |
| updatedAt | number | timestamp |

### photos

| field | type | notes |
|---|---|---|
| id | string (uuid) | primary key |
| interestId | string | which orb it belongs to |
| blob | Blob/File | the image itself (IndexedDB stores binary natively) |
| caption | string | optional |
| isPinned | boolean | shows in "resurfaced memory" |
| createdAt | number | timestamp |

### entries

| field | type | notes |
|---|---|---|
| id | string (uuid) | primary key |
| interestId | string | which orb it belongs to |
| date | number | the day being journaled (user-set) |
| text | string | the entry |
| isPinned | boolean | shows in "resurfaced memory" |
| createdAt | number | timestamp |
| updatedAt | number | timestamp |

Derived, not stored: orb face photo (= newest photo for that interest), streaks (= computed from entry dates), counts.

## 8. Tech stack & architecture

- **Framework:** React, built with Vite (fast, simple, the standard for a student project).
- **Storage:** IndexedDB, accessed through Dexie.js — a tiny wrapper that makes IndexedDB feel like a normal database (`db.interests.add(...)`, `db.entries.where('interestId').equals(id)`). Do not use localStorage: it caps around 5 MB and can't store image blobs. IndexedDB stores Blob/File objects directly and has a much larger quota.
- **Routing:** React Router (four routes: `/`, `/interest/:id`, `/profile`, plus modals).
- **Styling:** your choice; Tailwind CSS or plain CSS modules both work. Aim for a soft, warm, glowing aesthetic (rounded, gradients, generous spacing).
- **Photos:** captured via a standard `<input type="file" accept="image/*" capture>`; store the resulting File/Blob in IndexedDB; render with `URL.createObjectURL(blob)` and revoke the URL on unmount to avoid memory leaks. Consider downscaling large images to ~1600px on the long edge before storing, to save space.
- **PWA (optional polish):** add a web manifest + icon so it can be "added to home screen" and open full-screen. This is a small change with a big "it feels like a real app" payoff.
- No backend, no accounts, no network calls in v1. Everything runs in the browser.

### Suggested component structure

```
App (router, bottom nav)
├─ HomeScreen
│  ├─ MemoryBanner        (resurfaced pinned/recent moment)
│  ├─ OrbGrid → OrbCard   (name + latest photo / color fallback)
│  └─ AddInterestModal
├─ InterestScreen
│  ├─ InterestHeader      (name, "why", edit menu)
│  ├─ Tabs
│  │  ├─ AlbumTab → PhotoGrid, PhotoViewer, AddPhotoSheet
│  │  └─ JournalTab → EntryList, EntryEditor
├─ ProfileScreen
└─ shared: Modal, Button, BottomNav, EmptyState
   data layer: db.js (Dexie schema + typed helper functions)
```

**Known risk to note in your write-up:** browser storage can be cleared by the user or the browser, which would lose data. For v1 this is an accepted trade-off; a manual export/import (JSON + images) is the recommended stretch feature and cloud sync (e.g. Supabase) is the v2 answer.

## 9. Build plan (phased — build in this order)

- **Phase 0 — Setup.** Vite + React + Router + Dexie schema + basic styling system. A blank app that routes between empty Home, Interest, and Profile screens.
- **Phase 1 — Interests skeleton.** Create / edit / delete interests. Home shows orbs as colored cards. Tapping an orb opens its (empty) detail screen. This is the walking skeleton of the whole loop.
- **Phase 2 — Journal.** Add / edit / delete dated entries inside an orb. Journal tab lists them reverse-chronologically.
- **Phase 3 — Album.** Photo capture/upload, blob storage in IndexedDB, photo grid, full-size viewer, delete. Downscale on save.
- **Phase 4 — The soul.** Orb faces show the latest photo; the home "resurfaced memory" banner; pinning; streaks/stats; polished empty states; gentle float/glow animation on orbs.
- **Phase 5 — Frame it.** Profile screen, in-app reminder nudge on open, PWA manifest + icon.
- **Stretch (only if ahead):** orb floating physics, JSON export/import backup, cloud sync.

A good milestone rule for a deadline: have Phases 0–3 fully working before you touch Phase 4. A plain-but-complete loop beats a beautiful half-loop.

## 10. Success criteria (competition lens)

Judges reward clear problem → specific user → a working core → evidence it helps, told in a tight demo. Optimize for:

- The 30-second core loop works flawlessly on a phone, live, offline.
- One real user quote. Get 2–3 target students to add a real interest and use it for a few days; a single honest reaction is worth more than any feature.
- Emotional resonance — the orb wall and resurfaced memory should make someone smile.
- A tight demo narrative (below), not a feature tour.

### Suggested 90-second demo script

1. Open to a warm wall of orbs — "everything this student loves." (5s)
2. The resurfaced-memory banner reminds them of a watercolor from last week. (10s)
3. Tap into Watercolors → show the growing album and the journal streak. (20s)
4. Add today's entry + a photo, live, in under 30 seconds. (25s)
5. Back to home — the orb's face has updated to the new photo. Close on the problem + the one user quote. (20s)

## 11. Open questions to resolve as you build

- Fixed color palette vs. custom colors for orbs — recommend a small curated palette (8–10 gradients) for a consistent, pretty look with zero design effort.
- How many example/starter interests to suggest in the empty state.
- Whether "pinning" is worth the small extra UI in v1, or whether "resurfaced memory" just pulls a recent moment automatically (simpler, still emotional).
- Localization: is the UI in Chinese? (Recommended for the target users — English copy above is placeholder.)
