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

// GROWTH RULE: a tree levels up every time its total "showed up" count
// (journal entries + photos, added together — either counts) crosses one of
// these thresholds. Index = stage, value = activities needed to reach it.
// Stage 0 is a bare seed; stage 4 is the full tree (see GEO/LEAF_COUNT in
// components/shared/Tree.jsx for what each stage actually looks like).
export const STAGE_THRESHOLDS = [0, 1, 3, 6, 12];

export function activityCount(interest, entries, photos) {
  return entriesOf(entries, interest.id).length + photosOf(photos, interest.id).length;
}

export function treeStage(interest, entries, photos) {
  const acts = activityCount(interest, entries, photos);
  let stage = 0;
  for (let s = STAGE_THRESHOLDS.length - 1; s >= 0; s--) {
    if (acts >= STAGE_THRESHOLDS[s]) { stage = s; break; }
  }
  return stage;
}

// How many more logged entries/photos this tree needs to reach the next
// stage — null once it's already fully grown (stage 4, nothing further).
export function actsToNextStage(interest, entries, photos) {
  const acts = activityCount(interest, entries, photos);
  const stage = treeStage(interest, entries, photos);
  if (stage >= STAGE_THRESHOLDS.length - 1) return null;
  return STAGE_THRESHOLDS[stage + 1] - acts;
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
