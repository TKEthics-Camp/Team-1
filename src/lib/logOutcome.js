import { stageProgress } from "./tree";
import { globalStreak } from "./derived";

// What one new log changed, worked out before it is saved so the moment
// after saving can show it: how far the tree moved toward its next stage,
// whether it grew, and whether the streak ticked up.
//
// Pure on purpose. The celebration is the reward for logging, and a reward
// that claimed growth the tree didn't have would teach a student not to
// believe it.
export function logOutcome(interest, entries, photos, { entry = null, photo = null } = {}) {
  const nextEntries = entry ? [...entries, entry] : entries;
  const nextPhotos = photo ? [...photos, photo] : photos;
  const before = stageProgress(interest, entries, photos);
  const after = stageProgress(interest, nextEntries, nextPhotos);
  const streakBefore = globalStreak(entries, photos);
  const streakAfter = globalStreak(nextEntries, nextPhotos);
  return {
    before,
    after,
    leveledUp: after.stage > before.stage,
    streak: streakAfter,
    streakGrew: streakAfter > streakBefore,
  };
}

// The duration to offer first for a hobby: whatever was logged for it most
// recently, since most sessions of one hobby run about the same length.
/**
 * @param {import("./types").Entry[]} entries
 * @param {string} interestId
 * @param {number} [fallback]
 */
export function usualMinutes(entries, interestId, fallback = 30) {
  /** @type {import("./types").Entry | null} */
  let latest = null;
  entries.forEach((e) => {
    if (e.interestId !== interestId || !(e.minutes > 0)) return;
    if (!latest || (e.createdAt || 0) > (latest.createdAt || 0)) latest = e;
  });
  return latest ? latest.minutes : fallback;
}
