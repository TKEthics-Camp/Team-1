import { uid } from "./id";
import { dateKey } from "./dates";
import { PALETTE } from "./constants";

const DAY = 86400000;
const DURATIONS = [15, 30, 45, 60, 90];

function daysAgoKey(n) {
  return dateKey(new Date(Date.now() - n * DAY));
}

function mkEntry(interestId, date) {
  return {
    id: uid(), interestId, date, text: "Logged for the demo.",
    minutes: DURATIONS[Math.floor(Math.random() * DURATIONS.length)],
    visibility: "private", isPinned: false, isDemo: true,
    createdAt: Date.now(), updatedAt: Date.now(),
  };
}

function mkInterest(cfg) {
  return {
    id: cfg.id, name: cfg.name, color: cfg.color, species: cfg.species, leafColor: cfg.leafColor,
    why: "", time: "16:00", days: [], friends: [], isDemo: true,
    createdAt: Date.now() - cfg.plantedDaysAgo * DAY, updatedAt: Date.now(),
  };
}

// Healthy, actively-tended trees. Their entries interleave across the last
// STREAK_DAYS days (round-robin by index) so the union covers every one of
// those days — a real, unbroken streak — while the rest of each tree's
// activity count is backfilled further in the past to reach its target
// growth stage.
const STREAK_DAYS = 14;
const GROWING = [
  { name: "Piano", color: PALETTE[2], species: "cherry", leafColor: "purple", plantedDaysAgo: 60, targetActs: 27, spreadDays: 55 },
  { name: "Basketball", color: PALETTE[4], species: "oak", leafColor: "green", plantedDaysAgo: 45, targetActs: 20, spreadDays: 40 },
  { name: "Drawing", color: PALETTE[1], species: "willow", leafColor: "gold", plantedDaysAgo: 25, targetActs: 13, spreadDays: 20 },
];

// Neglected on purpose — every entry is backdated to before its idle
// threshold, so the tree opens already wilting or dead (see lib/tree.js:
// WILT=7, BARE=14, DEAD=30 days idle).
const NEGLECTED = [
  { name: "Chess", color: PALETTE[6], species: "pine", leafColor: "red", plantedDaysAgo: 30, acts: 7, idleDays: 10 },
  { name: "Reading", color: PALETTE[5], species: "birch", leafColor: "green", plantedDaysAgo: 55, acts: 6, idleDays: 40 },
];

// A full sample garden — impressive right away, on the tap of one button:
// a fully-grown tree, a mid-growth one, a wilting one, a dead one (so the
// revive mechanic has something to show), and a real multi-week streak.
// Nothing here is designed to be kept — it's a demo, meant to be cleared.
export function demoGardenSeed() {
  const interests = [];
  const entries = [];

  GROWING.forEach((cfg, ti) => {
    const id = uid();
    interests.push(mkInterest({ ...cfg, id }));

    let acts = 0;
    for (let d = ti; d < STREAK_DAYS && acts < cfg.targetActs; d += GROWING.length) {
      entries.push(mkEntry(id, daysAgoKey(d)));
      acts++;
    }
    while (acts < cfg.targetActs) {
      entries.push(mkEntry(id, daysAgoKey(STREAK_DAYS + Math.floor(Math.random() * cfg.spreadDays))));
      acts++;
    }
  });

  NEGLECTED.forEach((cfg) => {
    const id = uid();
    interests.push(mkInterest({ ...cfg, id }));
    for (let i = 0; i < cfg.acts; i++) {
      entries.push(mkEntry(id, daysAgoKey(cfg.idleDays + i * 2)));
    }
  });

  return { interests, entries };
}
