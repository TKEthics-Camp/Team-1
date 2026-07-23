import { STUDENTS, CAPTIONS, IDEAS } from "./constants";

/* ================= fake community + school =================
   Everything here is fabricated demo content. No real accounts, no network
   call, no way to contact anyone. It exists to show the shape of the feature
   while staying inside the constitution: anonymised by default, finite (no
   infinite scroll), and every card ends by sending the kid back outside. */

// Gradient backdrop per category — shared by every hobby in that category so
// the family still reads as "sport" / "art" / etc. at a glance.
const CATEGORY_BG = {
  sport:  ["#7FD6A0", "#2E9E63", "M0 44 Q50 34 100 44 L100 60 L0 60Z"],
  art:    ["#C9A8FF", "#7A4BD0"],
  music:  ["#8FC6FF", "#2C6FC9"],
  mind:   ["#A8B4FF", "#5A5AD0"],
  food:   ["#FFC98F", "#E07C2C"],
  outdoor:["#9BE0FF", "#3FA0D8"],
  dance:  ["#FFA6CE", "#D0468A"],
};

// Used only if a hobby name has no entry in MOTIFS below (shouldn't happen
// for anything in IDEAS, but keeps custom/unrecognised names from breaking).
const CATEGORY_FALLBACK = {
  sport:  '<circle cx="50" cy="30" r="11" fill="#fff"/><path d="M50 19 L54 27 L46 27Z M39 30 L47 33 L44 40Z M61 30 L53 33 L56 40Z" fill="#2E9E63"/>',
  art:    '<circle cx="38" cy="30" r="9" fill="#FF8FBF"/><circle cx="55" cy="24" r="7" fill="#FFD45E"/><circle cx="58" cy="38" r="8" fill="#6EE7A8"/><rect x="46" y="14" width="4" height="34" rx="2" fill="#fff" transform="rotate(24 48 30)"/>',
  music:  '<path d="M40 40 L40 20 L64 15 L64 35" stroke="#fff" stroke-width="3.5" fill="none"/><circle cx="38" cy="41" r="6" fill="#fff"/><circle cx="62" cy="36" r="6" fill="#fff"/>',
  mind:   '<path d="M50 20 L50 44 M50 20 Q40 16 32 20 L32 44 Q40 40 50 44 M50 20 Q60 16 68 20 L68 44 Q60 40 50 44" fill="#fff" fill-opacity=".85" stroke="#fff" stroke-width="1.5"/><circle cx="24" cy="16" r="1.6" fill="#fff"/><circle cx="76" cy="20" r="1.6" fill="#fff"/>',
  food:   '<path d="M34 30 A16 16 0 0 0 66 30 Z" fill="#fff"/><rect x="30" y="28" width="40" height="4" rx="2" fill="#fff"/><path d="M46 20 Q48 16 46 12 M54 20 Q56 16 54 12" stroke="#fff" stroke-width="2" fill="none" opacity=".8"/>',
  outdoor:'<circle cx="70" cy="20" r="8" fill="#FFE38A"/><path d="M10 46 L34 24 L52 46Z M40 46 L60 28 L82 46Z" fill="#fff" fill-opacity=".92"/>',
  dance:  '<path d="M50 16 L53 27 L64 30 L53 33 L50 44 L47 33 L36 30 L47 27Z" fill="#fff"/><circle cx="30" cy="20" r="2" fill="#fff"/><circle cx="70" cy="40" r="2" fill="#fff"/>',
};

// One motif per hobby (not just per category) — an illustration, deliberately
// not a photo of a real child. Keyed by the hobby's canonical English name
// (IDEAS[i][0]) so every idea in Explore shows something specific to that
// activity instead of one icon shared by everything in its category.
const MOTIFS = {
  // sport
  Basketball:     '<circle cx="50" cy="30" r="11" fill="#fff"/><path d="M50 19 L54 27 L46 27Z M39 30 L47 33 L44 40Z M61 30 L53 33 L56 40Z" fill="#2E9E63"/>',
  Football:       '<circle cx="50" cy="30" r="11" fill="#fff"/><path d="M50 23 L56 27.5 L53.5 34 L46.5 34 L44 27.5Z" fill="#1E7A3E"/><circle cx="50" cy="23" r="1.3" fill="#1E7A3E"/><circle cx="56" cy="27.5" r="1.3" fill="#1E7A3E"/><circle cx="53.5" cy="34" r="1.3" fill="#1E7A3E"/><circle cx="46.5" cy="34" r="1.3" fill="#1E7A3E"/><circle cx="44" cy="27.5" r="1.3" fill="#1E7A3E"/>',
  Badminton:      '<ellipse cx="42" cy="34" rx="9" ry="13" fill="none" stroke="#fff" stroke-width="3"/><line x1="42" y1="47" x2="42" y2="54" stroke="#fff" stroke-width="3"/><path d="M64 16 L60 24 L68 24Z" fill="#fff"/><path d="M60 24 Q64 28 68 24" fill="none" stroke="#fff" stroke-width="1.5"/>',
  "Table tennis": '<rect x="18" y="40" width="64" height="2" fill="#fff" opacity=".6"/><circle cx="40" cy="24" r="8" fill="#fff"/><rect x="38" y="31" width="4" height="9" rx="2" fill="#fff"/><circle cx="62" cy="18" r="4" fill="#fff"/>',
  Running:        '<circle cx="50" cy="15" r="4" fill="#fff"/><path d="M50 20 L46 32 L52 30 L48 44 M52 30 L58 40 M46 32 L38 30 M52 22 L60 18" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>',
  Cycling:        '<circle cx="36" cy="40" r="8" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="64" cy="40" r="8" fill="none" stroke="#fff" stroke-width="2.5"/><path d="M36 40 L48 24 L64 40 M48 24 L44 40 M48 24 L56 24" stroke="#fff" stroke-width="2.2" fill="none"/>',
  Swimming:       '<path d="M14 42 Q22 38 30 42 T46 42 T62 42 T86 42" stroke="#fff" stroke-width="2.5" fill="none"/><circle cx="50" cy="24" r="5" fill="#fff"/><path d="M50 29 L62 34 M50 29 L40 32" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
  "Rope skipping":'<path d="M30 44 Q50 8 70 44" stroke="#fff" stroke-width="2.5" fill="none"/><circle cx="50" cy="20" r="4.5" fill="#fff"/><path d="M50 25 L46 38 M50 25 L54 38 M46 38 L42 44 M54 38 L58 44" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
  // art
  Drawing:        '<circle cx="38" cy="30" r="9" fill="#FF8FBF"/><circle cx="55" cy="24" r="7" fill="#FFD45E"/><circle cx="58" cy="38" r="8" fill="#6EE7A8"/><rect x="46" y="14" width="4" height="34" rx="2" fill="#fff" transform="rotate(24 48 30)"/>',
  Watercolor:     '<circle cx="38" cy="24" r="6" fill="#fff" opacity=".85"/><circle cx="55" cy="20" r="4" fill="#fff" opacity=".7"/><circle cx="60" cy="34" r="7" fill="#fff" opacity=".8"/><rect x="30" y="36" width="4" height="18" rx="2" fill="#fff" transform="rotate(20 32 45)"/>',
  Calligraphy:    '<path d="M30 40 Q50 44 68 20" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="60" y="10" width="4" height="16" rx="2" fill="#fff" transform="rotate(35 62 18)"/><ellipse cx="34" cy="42" rx="6" ry="3" fill="#fff" opacity=".5"/>',
  "Paper cutting":'<path d="M50 14 L50 46 M36 30 L64 30 M40 20 L60 40 M60 20 L40 40" stroke="#fff" stroke-width="2"/><circle cx="50" cy="30" r="4" fill="#fff"/>',
  Photography:    '<rect x="32" y="22" width="36" height="24" rx="4" fill="#fff"/><circle cx="50" cy="34" r="8" fill="none" stroke="#7A4BD0" stroke-width="3"/><rect x="44" y="16" width="12" height="7" rx="2" fill="#fff"/>',
  Origami:        '<path d="M50 14 L66 34 L50 46 L34 34Z" fill="#fff"/><path d="M50 14 L50 46 M34 34 L66 34" stroke="#7A4BD0" stroke-width="1.5"/>',
  "Clay modeling":'<ellipse cx="50" cy="44" rx="18" ry="4" fill="#fff" opacity=".5"/><path d="M42 44 Q38 30 44 20 Q50 14 56 20 Q62 30 58 44Z" fill="#fff"/>',
  Comics:         '<rect x="24" y="14" width="20" height="16" rx="2" fill="none" stroke="#fff" stroke-width="2"/><rect x="48" y="14" width="26" height="16" rx="2" fill="none" stroke="#fff" stroke-width="2"/><rect x="24" y="34" width="50" height="12" rx="2" fill="none" stroke="#fff" stroke-width="2"/><circle cx="34" cy="22" r="3" fill="#fff"/>',
  // music
  Piano:          '<rect x="26" y="24" width="48" height="20" rx="2" fill="#fff"/><rect x="30" y="24" width="4" height="12" fill="#2C6FC9"/><rect x="38" y="24" width="4" height="12" fill="#2C6FC9"/><rect x="50" y="24" width="4" height="12" fill="#2C6FC9"/><rect x="58" y="24" width="4" height="12" fill="#2C6FC9"/><rect x="66" y="24" width="4" height="12" fill="#2C6FC9"/>',
  Guitar:         '<ellipse cx="42" cy="38" rx="12" ry="9" fill="#fff"/><circle cx="42" cy="38" r="4" fill="#2C6FC9"/><rect x="52" y="14" width="5" height="26" rx="2" fill="#fff" transform="rotate(18 54 27)"/>',
  Singing:        '<rect x="46" y="14" width="8" height="18" rx="4" fill="#fff"/><path d="M40 26 Q40 36 50 36 Q60 36 60 26" stroke="#fff" stroke-width="2.5" fill="none"/><line x1="50" y1="36" x2="50" y2="46" stroke="#fff" stroke-width="2.5"/>',
  Erhu:           '<rect x="47" y="10" width="3" height="30" fill="#fff"/><ellipse cx="48.5" cy="42" rx="7" ry="8" fill="#fff"/><path d="M44 12 Q48 8 52 12" stroke="#fff" stroke-width="2" fill="none"/>',
  Flute:          '<rect x="24" y="28" width="52" height="6" rx="3" fill="#fff" transform="rotate(-8 50 31)"/><circle cx="38" cy="30" r="1.6" fill="#2C6FC9"/><circle cx="46" cy="29.5" r="1.6" fill="#2C6FC9"/><circle cx="54" cy="29" r="1.6" fill="#2C6FC9"/>',
  Drums:          '<ellipse cx="50" cy="26" rx="14" ry="6" fill="#fff"/><rect x="36" y="26" width="28" height="14" fill="#fff" opacity=".85"/><ellipse cx="50" cy="40" rx="14" ry="6" fill="#fff"/><path d="M40 20 L58 34 M58 20 L40 34" stroke="#2C6FC9" stroke-width="2.5" stroke-linecap="round"/>',
  // mind
  Reading:        '<path d="M50 20 L50 44 M50 20 Q40 16 32 20 L32 44 Q40 40 50 44 M50 20 Q60 16 68 20 L68 44 Q60 40 50 44" fill="#fff" fill-opacity=".85" stroke="#fff" stroke-width="1.5"/><circle cx="24" cy="16" r="1.6" fill="#fff"/><circle cx="76" cy="20" r="1.6" fill="#fff"/>',
  Chess:          '<path d="M50 16 L54 20 L50 24 L46 20Z M44 30 Q50 24 56 30 L54 42 L46 42Z" fill="#fff"/><rect x="34" y="42" width="32" height="4" fill="#fff" opacity=".5"/>',
  Go:             '<path d="M30 18 V42 M40 18 V42 M50 18 V42 M60 18 V42 M70 18 V42 M30 18 H70 M30 26 H70 M30 34 H70 M30 42 H70" stroke="#fff" stroke-width="1" opacity=".6"/><circle cx="40" cy="26" r="4" fill="#fff"/><circle cx="50" cy="34" r="4" fill="#1c1c1e"/><circle cx="60" cy="26" r="4" fill="#fff"/>',
  Journaling:     '<rect x="32" y="14" width="30" height="32" rx="2" fill="#fff"/><path d="M38 22 H56 M38 28 H56 M38 34 H50" stroke="#5A5AD0" stroke-width="1.6"/><rect x="58" y="10" width="4" height="20" rx="2" fill="#fff" transform="rotate(35 60 20)"/>',
  Puzzles:        '<path d="M30 20 h14 a4 4 0 0 1 0 8 a4 4 0 0 0 0 8 h-14z" fill="#fff"/><path d="M44 20 h14 v14 a4 4 0 0 1 -8 0 a4 4 0 0 0 -8 0z" fill="#fff" opacity=".8"/>',
  "Star gazing":  '<circle cx="30" cy="16" r="1.6" fill="#fff"/><circle cx="70" cy="20" r="1.6" fill="#fff"/><circle cx="60" cy="12" r="1.2" fill="#fff"/><path d="M42 14 A10 10 0 1 0 44 34 A8 8 0 1 1 42 14Z" fill="#fff"/><rect x="52" y="30" width="24" height="5" rx="2" fill="#fff" transform="rotate(28 64 32)"/>',
  // food
  Cooking:        '<path d="M34 30 A16 16 0 0 0 66 30 Z" fill="#fff"/><rect x="30" y="28" width="40" height="4" rx="2" fill="#fff"/><path d="M46 20 Q48 16 46 12 M54 20 Q56 16 54 12" stroke="#fff" stroke-width="2" fill="none" opacity=".8"/>',
  Baking:         '<path d="M36 44 L40 28 h20 l4 16Z" fill="#fff"/><path d="M40 28 Q50 14 60 28" fill="#fff"/><circle cx="50" cy="16" r="2.4" fill="#E07C2C"/>',
  Gardening:      '<path d="M50 44 V26 M50 26 Q42 22 40 14 M50 26 Q58 22 60 14" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/><ellipse cx="50" cy="45" rx="14" ry="3" fill="#fff" opacity=".5"/>',
  "Tea making":   '<path d="M32 34 Q32 24 44 24 h8 Q64 24 64 34 v4 Q64 44 50 44 h-6 Q32 44 32 38Z" fill="#fff"/><path d="M64 30 q8 0 8 6 q0 6 -8 6" stroke="#fff" stroke-width="2.5" fill="none"/><path d="M46 16 q2 -4 0 -8 M52 16 q2 -4 0 -8" stroke="#fff" stroke-width="2" fill="none" opacity=".8"/>',
  // outdoor
  Hiking:         '<circle cx="70" cy="20" r="8" fill="#FFE38A"/><path d="M10 46 L34 24 L52 46Z M40 46 L60 28 L82 46Z" fill="#fff" fill-opacity=".92"/>',
  Fishing:        '<path d="M28 16 L62 40" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><path d="M62 40 Q66 46 62 50" stroke="#fff" stroke-width="1.5" fill="none"/><path d="M20 46 Q30 42 40 46 T60 46 T80 46" stroke="#fff" stroke-width="2" fill="none"/>',
  "Bird watching":'<path d="M34 30 Q40 22 48 28 Q52 22 60 26 Q56 30 60 34 Q52 32 48 34 Q42 34 34 30Z" fill="#fff"/><circle cx="30" cy="44" r="6" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="44" cy="44" r="6" fill="none" stroke="#fff" stroke-width="2.5"/>',
  "Kite flying":  '<path d="M50 12 L64 30 L50 48 L36 30Z" fill="#fff"/><path d="M50 12 V48 M36 30 H64" stroke="#3FA0D8" stroke-width="1.2"/><path d="M50 48 Q46 52 50 55 Q54 58 50 60" stroke="#fff" stroke-width="1.6" fill="none"/>',
  // dance
  Dancing:        '<path d="M50 16 L53 27 L64 30 L53 33 L50 44 L47 33 L36 30 L47 27Z" fill="#fff"/><circle cx="30" cy="20" r="2" fill="#fff"/><circle cx="70" cy="40" r="2" fill="#fff"/>',
  "Jump rope tricks": '<path d="M26 40 Q50 6 74 40" stroke="#fff" stroke-width="2.5" fill="none"/><circle cx="50" cy="18" r="4.5" fill="#fff"/><path d="M50 23 Q56 30 50 36 Q44 30 50 23Z" fill="#fff"/><path d="M50 36 L46 44 M50 36 L54 44" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>',
  Skateboarding:  '<rect x="28" y="36" width="44" height="6" rx="3" fill="#fff" transform="rotate(-6 50 39)"/><circle cx="36" cy="46" r="3.5" fill="#fff"/><circle cx="64" cy="42" r="3.5" fill="#fff"/><path d="M20 30 H30 M22 24 H30" stroke="#fff" stroke-width="1.6" opacity=".7"/>',
};

// Recovers the canonical English key MOTIFS/IDEAS use, from either language.
function motifKey(name) {
  const low = String(name).toLowerCase();
  const idea = IDEAS.find((i) => i[0].toLowerCase() === low || i[1] === name);
  return idea ? idea[0] : null;
}

// A hobby scene as an inline SVG — an illustration, deliberately not a photo
// of a real child. `name` can be either language; falls back to a generic
// per-category picture if it isn't one of the curated IDEAS.
export function scene(name, cat, seed) {
  const g = CATEGORY_BG[cat] || CATEGORY_BG.mind;
  const id = "g" + cat + (seed || 0);
  const key = motifKey(name);
  const motif = (key && MOTIFS[key]) || CATEGORY_FALLBACK[cat] || CATEGORY_FALLBACK.mind;
  return '<svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="' + g[0] + '"/><stop offset="1" stop-color="' + g[1] + '"/></linearGradient></defs>' +
    '<rect width="100" height="60" fill="url(#' + id + ')"/>' +
    (g[2] ? '<path d="' + g[2] + '" fill="rgba(255,255,255,.18)"/>' : "") +
    motif + '</svg>';
}

// Build a finite, stable feed: each student's most-active orb becomes one post.
export function communityPosts() {
  const out = [];
  STUDENTS.forEach((st, si) => {
    const orb = st.orbs[0];
    const caps = CAPTIONS[orb[2]] || CAPTIONS.mind;
    const cap = caps[si % caps.length];
    out.push({
      student: st, cat: orb[2], hobby: [orb[0], orb[1]],
      caption: cap, minutes: 30 + (si % 4) * 15, daysAgo: si % 5, seed: si,
    });
  });
  return out;
}

// Which of a student's orbs the user also has (by EN or ZH name).
export function studentShared(st, interests) {
  return st.orbs.filter((o) =>
    interests.some((it) => it.name.toLowerCase() === o[0].toLowerCase() || (it.nameZh && it.nameZh === o[1]))
  );
}

export function relTime(d, lang, t) {
  if (d <= 0) return lang === "en" ? "today" : "今天";
  return lang === "en" ? d + "d" + t("ago") : d + t("dLabel") + t("ago");
}
