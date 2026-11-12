import { dateKey, keyDays } from "./dates";
import { globalStreak, REST_EVERY_DAYS } from "./derived";

// Everything the week strip and the Insights view show. All of it is
// derived from entries and photos on the spot — nothing here is stored, so
// none of it can drift from what was actually logged.
//
// Weeks start on Monday, in both languages: a school week is the unit these
// students think in, and a strip that starts on Sunday splits their weekend.

// Every day with something logged: its minutes and how many logs. A photo
// counts as showing up, the same as it does for the streak, but adds no time.
export function activityByDay(entries, photos) {
  const days = new Map();
  const bump = (key, minutes) => {
    const d = days.get(key) || { minutes: 0, logs: 0 };
    d.minutes += minutes;
    d.logs += 1;
    days.set(key, d);
  };
  entries.forEach((e) => bump(e.date, e.minutes || 0));
  photos.forEach((p) => bump(dateKey(new Date(p.createdAt)), 0));
  return days;
}

// Midnight on the Monday of the week `d` falls in.
export function weekStart(d) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}

function plusDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// This week, Monday to Sunday: which days have a log, which is today, and
// which haven't happened yet.
export function weekStrip(entries, photos, now = new Date()) {
  const days = activityByDay(entries, photos);
  const start = weekStart(now);
  const todayKey = dateKey(now);
  return Array.from({ length: 7 }, (_, i) => {
    const d = plusDays(start, i);
    const key = dateKey(d);
    const a = days.get(key);
    return {
      key,
      dow: d.getDay(),
      logged: !!a,
      minutes: a ? a.minutes : 0,
      isToday: key === todayKey,
      isFuture: key > todayKey,
    };
  });
}

// Minutes logged in each of the last `weeks` weeks, oldest first, so the
// last one is the week in progress.
export function weeklyMinutes(entries, now = new Date(), weeks = 8) {
  const start = weekStart(now);
  const out = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const from = dateKey(plusDays(start, -7 * w));
    const to = dateKey(plusDays(start, -7 * w + 7));
    out.push({
      start: from,
      minutes: entries.reduce((n, e) => n + (e.date >= from && e.date < to ? e.minutes || 0 : 0), 0),
    });
  }
  return out;
}

// How strongly a day is drawn: 0 nothing, 1 showed up, 2 half an hour, 3 an
// hour or more. Thresholds are in minutes of one day, not relative to the
// student's own best — a quiet week shouldn't look like a failure next to
// one unusually long Saturday.
function levelOf(a) {
  if (!a) return 0;
  if (a.minutes >= 60) return 3;
  if (a.minutes >= 30) return 2;
  return 1;
}

// The activity grid: one column per week (oldest first), seven days each,
// Monday at the top. Days that haven't happened yet carry level -1 so they
// can be left blank rather than drawn as missed.
export function heatmap(entries, photos, now = new Date(), weeks = 15) {
  const days = activityByDay(entries, photos);
  const start = weekStart(now);
  const todayKey = dateKey(now);
  const cols = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const col = [];
    for (let i = 0; i < 7; i++) {
      const d = plusDays(start, -7 * w + i);
      const key = dateKey(d);
      const a = days.get(key);
      col.push({
        key,
        level: key > todayKey ? -1 : levelOf(a),
        minutes: a ? a.minutes : 0,
        logs: a ? a.logs : 0,
        month: d.getMonth(),
        date: d.getDate(),
      });
    }
    cols.push(col);
  }
  return cols;
}

// Time and logs per hobby over the last `days` days, busiest first. Every
// hobby is listed, including ones with nothing in the window — a bar at
// zero is information too.
export function byHobby(interests, entries, photos, now = new Date(), days = 30) {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const fromKey = dateKey(plusDays(from, -(days - 1)));
  const fromMs = plusDays(from, -(days - 1)).getTime();
  return interests
    .map((interest) => {
      const mine = entries.filter((e) => e.interestId === interest.id && e.date >= fromKey);
      const pics = photos.filter((p) => p.interestId === interest.id && p.createdAt >= fromMs);
      return {
        interest,
        minutes: mine.reduce((n, e) => n + (e.minutes || 0), 0),
        logs: mine.length + pics.length,
      };
    })
    .sort((a, b) => b.minutes - a.minutes || b.logs - a.logs);
}

// The weekday (0 Sunday … 6 Saturday) with the most active days, or null
// until there are enough days for the answer to mean anything.
export function bestWeekday(entries, photos, minDays = 5) {
  const days = activityByDay(entries, photos);
  if (days.size < minDays) return null;
  const counts = [0, 0, 0, 0, 0, 0, 0];
  days.forEach((_, key) => {
    const [y, m, d] = key.split("-").map(Number);
    counts[new Date(y, m - 1, d).getDay()] += 1;
  });
  let best = 0;
  counts.forEach((n, i) => { if (n > counts[best]) best = i; });
  return best;
}

// The longest streak there has ever been, by the same rule the current
// streak uses (see streakDetail): days actually logged, with one missed day
// forgiven per rolling week. Counted by a different rule, a record could
// come out shorter than the streak it is supposed to be the best of.
export function bestRun(entries, photos) {
  const days = Array.from(activityByDay(entries, photos).keys()).map(keyDays).sort((x, y) => x - y);
  let best = 0, run = 0, prev = null, lastRest = -Infinity;
  days.forEach((day) => {
    const gap = prev === null ? null : day - prev;
    if (gap === 1) {
      run += 1;
    } else if (gap === 2 && day - 1 - lastRest >= REST_EVERY_DAYS) {
      // one missed day, and the last forgiven one was long enough ago
      lastRest = day - 1;
      run += 1;
    } else {
      run = 1;
      lastRest = -Infinity;
    }
    if (run > best) best = run;
    prev = day;
  });
  return best;
}

// The handful of numbers at the top of Insights.
export function summary(entries, photos, now = new Date()) {
  const weeks = weeklyMinutes(entries, now, 2);
  const streak = globalStreak(entries, photos);
  return {
    streak,
    // Never less than the streak in progress, whichever way the two walks
    // happen to place a rest day.
    bestRun: Math.max(bestRun(entries, photos), streak),
    activeDays: activityByDay(entries, photos).size,
    totalMinutes: entries.reduce((n, e) => n + (e.minutes || 0), 0),
    weekMinutes: weeks[1].minutes,
    lastWeekMinutes: weeks[0].minutes,
  };
}
