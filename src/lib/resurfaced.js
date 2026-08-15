import { dateKey, keyDays, today } from "./dates";
import { entriesOf } from "./derived";

// Picks the one memory the home screen resurfaces: a quiet orb's best moment
// if one has gone untouched for 4+ days, otherwise a pinned/recent photo or
// journal entry (day-rotated so it doesn't repeat within the same day).
export function getResurfacedMemory(interests, photos, entries) {
  const byId = (id) => interests.find((x) => x.id === id);
  const pool = [];
  photos.forEach((p) => {
    const it = byId(p.interestId); if (!it) return;
    pool.push({ interest: it, blob: p.blob, text: p.caption, date: dateKey(new Date(p.createdAt)), pin: p.isPinned, at: p.createdAt });
  });
  entries.forEach((e) => {
    const it = byId(e.interestId); if (!it) return;
    pool.push({ interest: it, blob: null, text: e.text, date: e.date, pin: e.isPinned, at: e.createdAt });
  });
  if (!pool.length) return null;

  let quietest = null, quietDays = 0;
  interests.forEach((it) => {
    const en = entriesOf(entries, it.id);
    if (!en.length) return; // never started — not "neglected"
    const last = keyDays(en[0].date);
    const gap = Math.floor(keyDays(today()) - last);
    if (gap >= 4 && gap > quietDays) { quietDays = gap; quietest = it; }
  });
  if (quietest) {
    const mine = pool.filter((x) => x.interest.id === quietest.id);
    const best = mine.find((x) => x.pin) || mine[0];
    if (best) return { ...best, quietDays };
  }

  const pinned = pool.filter((x) => x.pin);
  const from = pinned.length ? pinned : pool;
  const old = from.filter((x) => Date.now() - x.at > 3 * 86400000);
  const pick = old.length ? old : from;
  return pick[Math.floor(Date.now() / 86400000) % pick.length];
}
