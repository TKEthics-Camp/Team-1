import { dateKey, today } from "./dates";

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

// A day counts toward the streak whether it was logged with a journal entry
// or a photo — either one is "showing up" for the interest that day.
export function interestStreak(entries, photos, id) {
  var dates = entriesOf(entries, id).map((e) => e.date)
    .concat(photosOf(photos, id).map((p) => dateKey(new Date(p.createdAt))));
  return streakOf(dates);
}

export function globalStreak(entries, photos) {
  var dates = entries.map((e) => e.date).concat(photos.map((p) => dateKey(new Date(p.createdAt))));
  return streakOf(dates);
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
