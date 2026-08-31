import { shade } from "./color";

/* ================================ seasons ================================
   Trees pick up the time of year. This only ever touches a *healthy* tree:
   wilting, bare and dead each have their own colours already, and those
   colours are the app's only signal that a tree is in trouble. Tinting them
   by season would make a dying tree in autumn look like a healthy one, which
   trades a working mechanic for decoration.

   Northern hemisphere by month — there's no reliable way to read hemisphere
   from the browser (a timezone is not a latitude), so rather than guess
   wrong half the time this assumes north and keeps the mapping in one place
   for anyone who wants to flip or expose it later.
   ========================================================================= */

export const SEASONS = ["winter", "spring", "summer", "autumn"];

export function seasonOf(date) {
  const m = (date || new Date()).getMonth(); // 0 = January
  if (m <= 1 || m === 11) return "winter";   // Dec–Feb
  if (m <= 4) return "spring";               // Mar–May
  if (m <= 7) return "summer";               // Jun–Aug
  return "autumn";                           // Sep–Nov
}

// How far each season pulls the tree's own leaf colour, and where. Summer is
// the baseline the colours were designed at, so it does nothing at all.
const TINT = {
  spring: { mix: "#8FE3A8", amount: 0.22, lift: 8 },
  summer: null,
  // pulled toward red rather than pure gold on purpose: the wilting
  // palette is a yellow-olive, and an autumn tree that lands near it makes a
  // healthy tree look sick for three months of the year.
  autumn: { mix: "#D2601E", amount: 0.72, lift: -2 },
  winter: { mix: "#A8BFC4", amount: 0.56, lift: -10 },
};

function blend(hex, other, amount) {
  const h = (c) => parseInt(c.slice(1), 16);
  const a = h(hex), b = h(other);
  const mix = (sa, sb) => Math.round(((sa >> 0) & 255) * (1 - amount) + ((sb >> 0) & 255) * amount);
  const r = mix(a >> 16, b >> 16), g = mix((a >> 8) & 255, (b >> 8) & 255), bl = mix(a & 255, b & 255);
  return "#" + [r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join("");
}

// Takes the two foliage colours a tree would otherwise use and returns them
// shifted for the season. Anything but a healthy tree is handed straight
// back untouched.
export function seasonalFoliage([lite, dark], season, healthy) {
  const t = healthy ? TINT[season] : null;
  if (!t) return [lite, dark];
  return [
    shade(blend(lite, t.mix, t.amount), t.lift),
    shade(blend(dark, t.mix, t.amount), t.lift),
  ];
}
