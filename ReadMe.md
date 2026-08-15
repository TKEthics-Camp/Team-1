<p align="center">
  <img src="public/icons/icon-192.png" width="96" height="96" alt="Leaves icon" />
</p>

<h1 align="center">Leaves</h1>
<p align="center"><em>A private garden of trees — one for each thing you make, play, or do.</em></p>

---

## What it is

Leaves is a habit tracker that never feels like one. Every hobby you plant — piano, basketball, drawing, whatever — grows into its own tree. Show up and log a photo or a journal entry, and it visibly grows: sapling → young tree → full tree, one stage at a time, each one asking a little more of you than the last. Ignore it too long and it wilts, then drops its leaves, then dies — quietly, honestly, the way a real plant would. You can bring a dead tree back for a handful of coins, but you have to earn the coins first.

There's no feed. No followers. No stranger's garden to compare yours against. If you're in a class, you can see your classmates' *shared* interests — never a wall of their private data. Everything else lives on your device.

## The design story

A few decisions this app is built around, on purpose:

- **One streak, not one per hobby.** Like Duolingo, doing *any* one thing today keeps your streak alive — the app cares that you showed up, not which tree you watered. `src/lib/derived.js`
- **Trees die honestly.** No forgiving grace periods, no streak freezes bought with real money. Seven days idle and a tree starts wilting; thirty and it's gone. Reviving one costs coins you earned by actually logging things. `src/lib/tree.js`
- **Growth slows down as it gets bigger** — 5 logs to sprout, then 6 more, then 7, then 8 to reach a full tree — so a young tree feels quick and a mature one feels *earned*, the way real skill-building does.
- **Nine species, four leaf colors**, chosen when you plant a tree (or inherited deterministically for anyone who planted before the picker existed) — so a garden of five hobbies doesn't look like five copies of the same tree.
- **A local-first architecture as a feature, not a limitation.** Your garden is cached on-device and works offline (see [PWA](#installable--offline) below). Signing in just ties that garden to your account for backup — there's no ad network to feed, so there's nothing to gain from making the app sticky in bad ways.

## Screenshots

<!-- Drop PNGs into docs/screenshots/ and swap these paths in — home.png, tree-detail.png, year-in-review.png, onboarding.png suggested. -->

| Home — swipe through your grove | A tree's own page | Year in Review |
| --- | --- | --- |
| `docs/screenshots/home.png` | `docs/screenshots/tree-detail.png` | `docs/screenshots/year-in-review.png` |

## Feature tour

- **The grove** — every hobby is a full-screen tree; swipe sideways to walk between them (`src/components/home/OrbWall.jsx`).
- **Guided tour** — Sprig, the mascot, walks a first-time visitor across Home, Explore, and Me on first login, or on demand from Me → "Show me around again" (`src/components/shared/MascotTour.jsx`).
- **Year in Review** — a full-screen, story-paced recap (tap to advance) of hours logged, longest streak, top hobby, and grove size. Has a one-tap demo mode with realistic sample data, so it's never empty on a fresh account (`src/components/sheets/YearReviewSheet.jsx`).
- **Plant a demo garden** — one button (Me → "Plant a demo garden") seeds five trees at every stage and health — full-grown, mid-growth, wilting, dead — plus a real two-week streak, so there's something worth looking at immediately (`src/lib/demoGarden.js`).
- **Level-up moments** — logging the entry that pushes a tree into its next growth stage gets a small leaf-burst celebration instead of just a number changing (`src/components/shared/LevelUpBurst.jsx`).
- **Class codes** — a school/group account joins with a class code instead of a solo interests list, and unlocks a classmates view scoped to shared interests only (`src/components/onboarding/ClassCodeStep.jsx`).

## Installable & offline

Leaves is a PWA: `manifest.webmanifest` + a hand-rolled service worker (`public/sw.js`, network-first with a same-origin cache fallback — no bundler plugin needed since Vite's hashed filenames rule out a static precache list). Visit it once, and it's addable to your home screen and keeps working without a connection.

## Getting started

```bash
npm install       # only needed once, or after pulling new dependencies
```

Copy `.env.local.example` to `.env.local` and fill in your own [Supabase](https://supabase.com) project's URL and anon key — auth needs a real project to sign up/in against.

```bash
npm run dev        # start the dev server
npm run build       # production build, output in dist/
npm run preview     # serve the production build locally
```

Deploying to Vercel or Netlify both work out of the box — `vercel.json` and `netlify.toml` (plus `public/_redirects` for any other static host) are already set up to rewrite every path back to `index.html`, so refreshing `/interest/xyz` doesn't 404.

## Tech stack

React 18 + Vite, React Router, Dexie (IndexedDB) for local storage, Supabase for auth, no CSS framework — hand-written CSS with theme tokens (`src/styles/tokens.css`) driving eight color skins.
