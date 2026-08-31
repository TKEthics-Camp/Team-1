import { globalStreak } from "./derived";
import { treeStage, speciesOf } from "./tree";

/* ============================ milestone badges ============================
   Every badge is derived, never stored: `progress` reads the same interests
   /entries/photos the rest of the app already has, so a badge can't drift
   out of sync with reality, and clearing your garden correctly takes the
   badges with it.

   The only thing persisted is which ones have already been *announced*
   (profile.earnedBadges) — otherwise every reload would re-celebrate
   everything you'd ever earned.

   Each badge reports {have, need} rather than a bare boolean so a locked
   badge can still show how far along it is; "3 / 7" is the part that makes
   the next one feel reachable.
   ========================================================================= */

function logCount(entries, photos) {
  return entries.length + photos.length;
}

function fullyGrown(interests, entries, photos) {
  return interests.filter((it) => treeStage(it, entries, photos) >= 4).length;
}

function speciesCount(interests) {
  return new Set(interests.map((it) => it.species || speciesOf(it))).size;
}

// icon + the two i18n keys for name and description. Tiers of the same idea
// are grouped so the sheet can show them in a sensible order.
export const BADGES = [
  { id: "firstLog",  icon: "🌱", need: 1,   of: (c) => logCount(c.entries, c.photos) },
  { id: "log25",     icon: "📓", need: 25,  of: (c) => logCount(c.entries, c.photos) },
  { id: "log100",    icon: "📚", need: 100, of: (c) => logCount(c.entries, c.photos) },

  { id: "streak3",   icon: "🔥", need: 3,   of: (c) => c.streak },
  { id: "streak7",   icon: "🗓️", need: 7,   of: (c) => c.streak },
  { id: "streak30",  icon: "🏅", need: 30,  of: (c) => c.streak },
  { id: "streak100", icon: "👑", need: 100, of: (c) => c.streak },

  { id: "plant1",    icon: "🪴", need: 1,   of: (c) => c.interests.length },
  { id: "plant5",    icon: "🌳", need: 5,   of: (c) => c.interests.length },
  { id: "species5",  icon: "🌈", need: 5,   of: (c) => speciesCount(c.interests) },

  { id: "grown1",    icon: "🌟", need: 1,   of: (c) => fullyGrown(c.interests, c.entries, c.photos) },
  { id: "grown3",    icon: "🏆", need: 3,   of: (c) => fullyGrown(c.interests, c.entries, c.photos) },
];

export function badgeState(interests, entries, photos) {
  const ctx = { interests, entries, photos, streak: globalStreak(entries, photos) };
  return BADGES.map((b) => {
    const have = b.of(ctx);
    return {
      id: b.id,
      icon: b.icon,
      have: Math.min(have, b.need),
      need: b.need,
      earned: have >= b.need,
    };
  });
}

export function earnedIds(interests, entries, photos) {
  return badgeState(interests, entries, photos).filter((b) => b.earned).map((b) => b.id);
}
