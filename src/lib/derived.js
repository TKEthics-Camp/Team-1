import { dateKey, keyDays, today } from "./dates";

export function photosOf(photos, id) {
  return photos.filter((p) => p.interestId === id).sort(byNewest);
}

export function entriesOf(entries, id) {
  return entries
    .filter((e) => e.interestId === id)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));
}

export function byNewest(a, b) { return b.createdAt - a.createdAt; }

export function streakOf(dates) {
  var set = {};
  dates.forEach((d) => { set[d] = true; });
  var cur = new Date(); cur.setHours(0, 0, 0, 0);
  if (!set[dateKey(cur)]) {
    cur.setDate(cur.getDate() - 1); // a streak survives until today ends
    if (!set[dateKey(cur)]) return 0;
  }
  var n = 0;
  while (set[dateKey(cur)]) { n++; cur.setDate(cur.getDate() - 1); }
  return n;
}

// The most recent local day this interest was shown up for — what the push
// server compares "today" against to know whether a streak reminder is due.
export function lastLoggedDay(entries, photos, id) {
  var dates = entriesOf(entries, id).map((e) => e.date)
    .concat(photosOf(photos, id).map((p) => dateKey(new Date(p.createdAt))));
  return dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null;
}

export function globalStreak(entries, photos) {
  var dates = entries.map((e) => e.date).concat(photos.map((p) => dateKey(new Date(p.createdAt))));
  return streakOf(dates);
}

// How many full days it's been since this hobby was planted — shown at the
// top of its own page instead of a per-hobby streak (see globalStreak, which
// is the one streak now, shared across every hobby).
export function daysSincePlanted(interest) {
  var plantedKey = dateKey(new Date(interest.createdAt || Date.now()));
  return keyDays(today()) - keyDays(plantedKey);
}

// Hours are the headline number on every orb, summed from what each entry logged.
export function minutesOf(entries, id) {
  return entriesOf(entries, id).reduce((n, e) => n + (e.minutes || 0), 0);
}

export function fmtHours(mins) {
  if (!mins) return "0h";
  if (mins < 60) return mins + "m";
  var h = mins / 60;
  return (h < 10 ? Math.round(h * 10) / 10 : Math.round(h)) + "h";
}

export { today };
