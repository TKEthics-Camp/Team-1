import { IDEAS, ADJACENT, CATS } from "./constants";

// Which category an interest belongs to, matched by English or Chinese name.
export function ideaCat(name) {
  const low = String(name).toLowerCase();
  for (let i = 0; i < IDEAS.length; i++) {
    if (IDEAS[i][0].toLowerCase() === low || IDEAS[i][1] === name) return IDEAS[i][3];
  }
  return null;
}

// The palette index a hobby name maps to (0 when unknown).
export function ideaColor(name) {
  const low = String(name).toLowerCase();
  for (let i = 0; i < IDEAS.length; i++) if (IDEAS[i][0].toLowerCase() === low) return IDEAS[i][2];
  return 0;
}

export function catLabel(c, lang) {
  return (CATS[c] || ["", ""])[lang === "en" ? 0 : 1];
}

// Does the user already have an orb for this hobby (by EN or ZH name)?
export function haveName(interests, name) {
  const low = String(name).toLowerCase();
  return interests.some((it) => it.name.toLowerCase() === low || (it.nameZh && it.nameZh === name));
}

// [enName, zhName] pair form.
export function haveHobby(interests, h) {
  return interests.some((it) => it.name.toLowerCase() === h[0].toLowerCase() || (it.nameZh && it.nameZh === h[1]));
}

export function hobbyName(h, lang) {
  return h[lang === "en" ? 0 : 1];
}

// A deterministic shuffle keyed by a seed, so "Shuffle" changes the order
// but a given seed is stable across a re-render.
export function shuffled(arr, seed) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280;
    const j = Math.floor((seed / 233280) * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

// Score every idea by how close it sits to what the user already loves.
export function recommendations(interests, nameOf, lang) {
  const cats = {};
  interests.forEach((it) => {
    const c = ideaCat(it.name); if (c) cats[c] = (cats[c] || 0) + 1;
  });
  if (!Object.keys(cats).length) return { list: [], reason: null };

  const scored = IDEAS.filter((idea) => !haveName(interests, idea[0]) && !haveName(interests, idea[1]))
    .map((idea) => {
      const c = idea[3];
      let s = 0;
      if (cats[c]) s += 3 * cats[c];
      (ADJACENT[c] || []).forEach((adj) => { if (cats[adj]) s += cats[adj]; });
      return { idea, score: s };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  // name up to two of the orbs that actually drove these picks
  const recognized = interests.filter((it) => ideaCat(it.name));
  const reason = recognized.slice(0, 2).map(nameOf).join(lang === "en" ? " & " : "、");

  return { list: scored.slice(0, 6).map((x) => x.idea), reason };
}
