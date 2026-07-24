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

// How long ago this tree was planted — independent of activity, so it keeps
// counting even on a healthy, freshly-tended tree.
export function daysPlanted(interest) {
  const planted = keyDays(dateKey(new Date((interest && interest.createdAt) || Date.now())));
  return Math.max(0, keyDays(today()) - planted);
}

// 0 seed → 4 full tree, by how many times you've shown up (entries + photos).
// Each stage asks for one more log than the last — 5 to sprout, then 6, 7,
// and 8 more to go from young tree to full tree — so growth visibly slows
// down the bigger the tree gets, the way a real one does.
const STAGE_COSTS = [5, 6, 7, 8]; // cost to go from stage N to N+1
const STAGE_THRESHOLDS = STAGE_COSTS.reduce((acc, cost) => {
  acc.push((acc[acc.length - 1] || 0) + cost);
  return acc;
}, []); // [5, 11, 18, 26]

export function treeStage(interest, entries, photos) {
  const acts = entriesOf(entries, interest.id).length + photosOf(photos, interest.id).length;
  for (let stage = STAGE_THRESHOLDS.length; stage >= 1; stage--) {
    if (acts >= STAGE_THRESHOLDS[stage - 1]) return stage;
  }
  return 0;
}

// How many more logs until this tree reaches its next stage — used to show
// "3 more to go" type progress instead of just the stage name.
export function actsToNextStage(interest, entries, photos) {
  const acts = entriesOf(entries, interest.id).length + photosOf(photos, interest.id).length;
  const next = STAGE_THRESHOLDS.find((n) => n > acts);
  return next === undefined ? 0 : next - acts;
}

// The stage-by-stage story of how this tree got here: one frame per stage
// it has actually reached, each dated to the log that pushed it over that
// stage's threshold (or, for stage 0, the day it was planted). Feeds the
// "watch it grow" replay — a fixed-length animation regardless of how many
// logs there are, since it always has at most 5 frames (stage 0 through 4).
export function growthTimeline(interest, entries, photos) {
  const acts = [];
  entriesOf(entries, interest.id).forEach((e) => acts.push(e.date));
  photosOf(photos, interest.id).forEach((p) => acts.push(dateKey(new Date(p.createdAt))));
  acts.sort();

  const plantedDate = dateKey(new Date((interest && interest.createdAt) || Date.now()));
  const frames = [{ stage: 0, date: plantedDate }];
  let stage = 0;
  acts.forEach((date, idx) => {
    const count = idx + 1;
    while (stage < STAGE_THRESHOLDS.length && count >= STAGE_THRESHOLDS[stage]) {
      stage++;
      frames.push({ stage, date });
    }
  });
  return frames;
}

export function treeHealth(interest, entries, photos) {
  const idle = daysIdle(interest, entries, photos);
  if (idle >= DEAD) return "dead";
  if (idle >= BARE) return "bare";
  if (idle >= WILT) return "wilting";
  return "healthy";
}

// Every hobby has a species and a leaf colour — chosen when the tree is
// planted (see OrbSheet), or picked deterministically from its id for older
// trees that predate the picker, so nothing ever looks unset.
export const SPECIES = ["oak", "willow", "pine", "birch", "maple", "cherry", "cypress", "palm", "bamboo"];

export const LEAF_COLORS = {
  green:  ["#63C489", "#2E9E63"],
  red:    ["#F2836B", "#C0503A"],
  gold:   ["#F2C25E", "#C4922A"],
  purple: ["#C48CE0", "#8C58B8"],
};

function hashOf(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function speciesOf(interest) {
  const id = (interest && interest.id) || "";
  return SPECIES[hashOf(id) % SPECIES.length];
}

export function leafColorOf(interest) {
  const id = (interest && interest.id) || "";
  const keys = Object.keys(LEAF_COLORS);
  return keys[hashOf("l" + id) % keys.length];
}

export const STAGE_KEY = ["stgSeed", "stgSprout", "stgSapling", "stgYoung", "stgFull"];
export const HEALTH_KEY = { healthy: "hlHealthy", wilting: "hlWilting", bare: "hlBare", dead: "hlDead" };
