import { keyToDate, dateKey } from "./dates";

function shiftDay(k, delta) {
  const d = keyToDate(k);
  d.setDate(d.getDate() + delta);
  return dateKey(d);
}

// Longest run of consecutive days in a set of date keys — not "the current
// streak", the best one that ever happened, so a burst from March still
// counts even if the streak broke afterward.
function longestRun(dateKeys) {
  const seen = new Set(dateKeys);
  let best = 0;
  seen.forEach((d) => {
    if (seen.has(shiftDay(d, -1))) return; // not the start of a run
    let len = 1, cur = d;
    while (seen.has(shiftDay(cur, 1))) { cur = shiftDay(cur, 1); len++; }
    if (len > best) best = len;
  });
  return best;
}

// Everything the Year in Review needs, computed fresh from real data — there
// is no time-lock in this app, so this works for any year with any amount
// of data (including none, which just yields zeros).
export function yearStats(interests, photos, entries, year) {
  const y = year || new Date().getFullYear();
  const inYear = (ms) => new Date(ms).getFullYear() === y;
  const en = entries.filter((e) => inYear(keyToDate(e.date).getTime()));
  const ph = photos.filter((p) => inYear(p.createdAt));

  const minutes = en.reduce((s, e) => s + (e.minutes || 0), 0);

  const counts = {};
  en.forEach((e) => { counts[e.interestId] = (counts[e.interestId] || 0) + 1; });
  ph.forEach((p) => { counts[p.interestId] = (counts[p.interestId] || 0) + 1; });
  let topId = null, topN = 0;
  Object.entries(counts).forEach(([id, n]) => { if (n > topN) { topN = n; topId = id; } });
  const top = interests.find((i) => i.id === topId) || null;

  const dateKeys = en.map((e) => e.date).concat(ph.map((p) => dateKey(new Date(p.createdAt))));
  const longestStreak = longestRun(dateKeys);

  const planted = interests.filter((i) => inYear(i.createdAt)).length;

  return { year: y, minutes, entryCount: en.length, photoCount: ph.length, top, topCount: topN, longestStreak, planted, totalTrees: interests.length };
}

// A rich, believable sample so "Try the demo" shows the full experience
// instantly, regardless of how much (or little) the real account has logged.
export function demoStats() {
  return {
    year: new Date().getFullYear(), minutes: 6120, entryCount: 148, photoCount: 96,
    top: { name: "Piano", color: "#B48CF2" }, topCount: 71,
    longestStreak: 23, planted: 5, totalTrees: 7, demo: true,
  };
}
