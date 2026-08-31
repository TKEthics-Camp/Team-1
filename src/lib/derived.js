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

// One rest day is forgiven per rolling week. Not a purchase and not a
// stockpile — you can't bank them, and two misses close together still ends
// the streak, so showing up remains the thing that keeps it alive.
export const REST_EVERY_DAYS = 7;

// Walks back from today. A missed day is skipped rather than fatal, but only
// if the last skip was at least REST_EVERY_DAYS further back — so a genuine
// every-other-day pattern breaks, while one missed Tuesday doesn't.
//
// Rest days are *not* counted into the number: the streak is days actually
// logged. A rest day only keeps the chain connected across the gap.
export function streakDetail(dates) {
  var set = {};
  dates.forEach((d) => { set[d] = true; });
  var cur = new Date(); cur.setHours(0, 0, 0, 0);
  // a streak survives until today ends, so today being empty isn't a miss yet
  if (!set[dateKey(cur)]) cur.setDate(cur.getDate() - 1);

  var n = 0, walked = 0, lastRestAt = -Infinity;
  var restsAt = [];        // where rests were spent, as walk offsets
  var lastLoggedAt = -1;   // furthest-back day actually logged
  for (;;) {
    if (set[dateKey(cur)]) {
      n++;
      lastLoggedAt = walked;
    } else {
      if (n === 0) break;                                 // nothing to protect yet
      if (walked - lastRestAt < REST_EVERY_DAYS) break;   // too soon for another
      lastRestAt = walked;
      restsAt.push(walked);
    }
    walked++;
    cur.setDate(cur.getDate() - 1);
    if (walked > 3650) break;                             // a decade is plenty of guard
  }
  // The walk always ends by spending a rest on the day *after* the streak's
  // oldest entry and then hitting the day after that. That trailing rest
  // bridges nothing — it sits past the last logged day — so it isn't a rest
  // the user actually used, and counting it made an unbroken streak report
  // one.
  var used = restsAt.filter((at) => at < lastLoggedAt);
  return {
    streak: n,
    rests: used.length,
    restingNow: used.indexOf(0) >= 0 || used.indexOf(1) >= 0,
  };
}

export function streakOf(dates) {
  return streakDetail(dates).streak;
}

// The streak is unified across every hobby — logging any one of them today
// keeps it alive, the way Duolingo counts any lesson toward one streak.
export function globalStreak(entries, photos) {
  return globalStreakDetail(entries, photos).streak;
}

export function globalStreakDetail(entries, photos) {
  var dates = entries.map((e) => e.date).concat(photos.map((p) => dateKey(new Date(p.createdAt))));
  return streakDetail(dates);
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
