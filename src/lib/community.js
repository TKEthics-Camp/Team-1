import { STUDENTS, CAPTIONS } from "./constants";

/* ================= fake community + school =================
   Everything here is fabricated demo content. No real accounts, no network
   call, no way to contact anyone. It exists to show the shape of the feature
   while staying inside the constitution: anonymised by default, finite (no
   infinite scroll), and every card ends by sending the kid back outside. */

// A hobby scene as an inline SVG — an illustration, deliberately not a photo
// of a real child. Keyed by category so any hobby has a matching picture.
export function scene(cat, seed) {
  const G = {
    sport:  ["#7FD6A0", "#2E9E63", "M0 44 Q50 34 100 44 L100 60 L0 60Z"],
    art:    ["#C9A8FF", "#7A4BD0"],
    music:  ["#8FC6FF", "#2C6FC9"],
    mind:   ["#A8B4FF", "#5A5AD0"],
    food:   ["#FFC98F", "#E07C2C"],
    outdoor:["#9BE0FF", "#3FA0D8"],
    dance:  ["#FFA6CE", "#D0468A"],
  };
  const g = G[cat] || G.mind;
  const id = "g" + cat + (seed || 0);
  const motif = {
    sport:  '<circle cx="50" cy="30" r="11" fill="#fff"/><path d="M50 19 L54 27 L46 27Z M39 30 L47 33 L44 40Z M61 30 L53 33 L56 40Z" fill="#2E9E63"/>',
    art:    '<circle cx="38" cy="30" r="9" fill="#FF8FBF"/><circle cx="55" cy="24" r="7" fill="#FFD45E"/><circle cx="58" cy="38" r="8" fill="#6EE7A8"/><rect x="46" y="14" width="4" height="34" rx="2" fill="#fff" transform="rotate(24 48 30)"/>',
    music:  '<path d="M40 40 L40 20 L64 15 L64 35" stroke="#fff" stroke-width="3.5" fill="none"/><circle cx="38" cy="41" r="6" fill="#fff"/><circle cx="62" cy="36" r="6" fill="#fff"/>',
    mind:   '<path d="M50 20 L50 44 M50 20 Q40 16 32 20 L32 44 Q40 40 50 44 M50 20 Q60 16 68 20 L68 44 Q60 40 50 44" fill="#fff" fill-opacity=".85" stroke="#fff" stroke-width="1.5"/><circle cx="24" cy="16" r="1.6" fill="#fff"/><circle cx="76" cy="20" r="1.6" fill="#fff"/>',
    food:   '<path d="M34 30 A16 16 0 0 0 66 30 Z" fill="#fff"/><rect x="30" y="28" width="40" height="4" rx="2" fill="#fff"/><path d="M46 20 Q48 16 46 12 M54 20 Q56 16 54 12" stroke="#fff" stroke-width="2" fill="none" opacity=".8"/>',
    outdoor:'<circle cx="70" cy="20" r="8" fill="#FFE38A"/><path d="M10 46 L34 24 L52 46Z M40 46 L60 28 L82 46Z" fill="#fff" fill-opacity=".92"/>',
    dance:  '<path d="M50 16 L53 27 L64 30 L53 33 L50 44 L47 33 L36 30 L47 27Z" fill="#fff"/><circle cx="30" cy="20" r="2" fill="#fff"/><circle cx="70" cy="40" r="2" fill="#fff"/>',
  };
  return '<svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="' + g[0] + '"/><stop offset="1" stop-color="' + g[1] + '"/></linearGradient></defs>' +
    '<rect width="100" height="60" fill="url(#' + id + ')"/>' +
    (g[2] ? '<path d="' + g[2] + '" fill="rgba(255,255,255,.18)"/>' : "") +
    (motif[cat] || motif.mind) + '</svg>';
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
