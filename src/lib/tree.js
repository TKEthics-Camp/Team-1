import { keyDays, today, dateKey } from "./dates";
import { entriesOf, photosOf } from "./derived";

// A hobby is a living tree. It grows each time you show up, and slowly dies if
// left alone. Both are derived — nothing extra is stored except an optional
// `revivedAt` timestamp set when the user pays coins to bring a dead tree back.

export const REVIVE_COST = 20;

// Wilt thresholds, in days since the last time you tended it.
const WILT = 7;   // getting dry
const BARE = 14;  // dropping leaves
const DEAD = 30;  // gone

// The most recent day this tree was tended: a log, a photo, a revive, or —
// for a brand-new tree with nothing yet — the day it was planted.
export function lastActiveDay(interest, entries, photos) {
  const days = [];
  entriesOf(entries, interest.id).forEach((e) => days.push(keyDays(e.date)));
  photosOf(photos, interest.id).forEach((p) => days.push(keyDays(dateKey(new Date(p.createdAt)))));
  if (interest.revivedAt) days.push(keyDays(dateKey(new Date(interest.revivedAt))));
  if (!days.length) days.push(keyDays(dateKey(new Date(interest.createdAt || Date.now()))));
  return Math.max(...days);
}

export function daysIdle(interest, entries, photos) {
  return keyDays(today()) - lastActiveDay(interest, entries, photos);
}

// 0 seed → 4 full tree, by how many times you've shown up (entries + photos).
export function treeStage(interest, entries, photos) {
  const acts = entriesOf(entries, interest.id).length + photosOf(photos, interest.id).length;
  if (acts >= 12) return 4;
  if (acts >= 6) return 3;
  if (acts >= 3) return 2;
  if (acts >= 1) return 1;
  return 0;
}

export function treeHealth(interest, entries, photos) {
  const idle = daysIdle(interest, entries, photos);
  if (idle >= DEAD) return "dead";
  if (idle >= BARE) return "bare";
  if (idle >= WILT) return "wilting";
  return "healthy";
}

export const STAGE_KEY = ["stgSeed", "stgSprout", "stgSapling", "stgYoung", "stgFull"];
export const HEALTH_KEY = { healthy: "hlHealthy", wilting: "hlWilting", bare: "hlBare", dead: "hlDead" };
