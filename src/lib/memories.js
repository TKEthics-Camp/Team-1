import { dateKey, keyToDate } from "./dates";
import { IDEAS, CATS } from "./constants";

// "On this day" — anything logged on today's month+day in a previous year,
// the way Apple Photos resurfaces an old photo on its anniversary.
export function onThisDay(interests, photos, entries) {
  const now = new Date();
  const mm = now.getMonth(), dd = now.getDate();
  const byId = (id) => interests.find((x) => x.id === id);
  const items = [];

  entries.forEach((e) => {
    const d = keyToDate(e.date);
    if (d.getMonth() !== mm || d.getDate() !== dd || d.getFullYear() >= now.getFullYear()) return;
    const it = byId(e.interestId); if (!it) return;
    items.push({ interest: it, blob: null, text: e.text, date: e.date, yearsAgo: now.getFullYear() - d.getFullYear() });
  });
  photos.forEach((p) => {
    const d = new Date(p.createdAt);
    if (d.getMonth() !== mm || d.getDate() !== dd || d.getFullYear() >= now.getFullYear()) return;
    const it = byId(p.interestId); if (!it) return;
    items.push({ interest: it, blob: p.blob, text: p.caption, date: dateKey(d), yearsAgo: now.getFullYear() - d.getFullYear() });
  });

  return items.sort((a, b) => a.yearsAgo - b.yearsAgo);
}

// Best-effort category match by hobby name against the curated IDEAS list —
// user-typed hobby names aren't tagged, so anything that doesn't match a
// known idea (e.g. a hobby name in the user's own words) just has no reel.
export function categoryOf(interest) {
  const nm = String((interest && interest.name) || "").toLowerCase();
  const idea = IDEAS.find((x) => x[0].toLowerCase() === nm);
  return idea ? idea[3] : null;
}

export function categoryLabel(cat, lang) {
  const c = CATS[cat];
  return c ? c[lang === "en" ? 0 : 1] : cat;
}

// One reel per category with at least `min` logged items, pooled across
// every hobby that shares it — an "Exercise" or "Art" style smart album,
// not tied to a single tree.
export function categoryReels(interests, photos, entries, min = 3) {
  const byId = (id) => interests.find((x) => x.id === id);
  const byCat = {};

  entries.forEach((e) => {
    const it = byId(e.interestId); if (!it) return;
    const cat = categoryOf(it); if (!cat) return;
    (byCat[cat] = byCat[cat] || []).push({ interest: it, blob: null, text: e.text, date: e.date, at: e.createdAt });
  });
  photos.forEach((p) => {
    const it = byId(p.interestId); if (!it) return;
    const cat = categoryOf(it); if (!cat) return;
    (byCat[cat] = byCat[cat] || []).push({ interest: it, blob: p.blob, text: p.caption, date: dateKey(new Date(p.createdAt)), at: p.createdAt });
  });

  return Object.entries(byCat)
    .filter(([, items]) => items.length >= min)
    .map(([cat, items]) => ({ cat, items: items.sort((a, b) => b.at - a.at) }))
    .sort((a, b) => b.items.length - a.items.length);
}
