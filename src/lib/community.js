import { STUDENTS, CAPTIONS, CLASS_CODES } from "./constants";

export function isValidClassCode(code) {
  return CLASS_CODES.includes(String(code || "").trim().toUpperCase());
}

/* ================= fake community + school =================
   Everything here is fabricated demo content. No real accounts, no network
   call, no way to contact anyone. It exists to show the shape of the feature
   while staying inside the constitution: anonymised by default, finite (no
   infinite scroll), and every card ends by sending the kid back outside. */

// One clear, recognisable emoji per hobby — instantly readable, unlike the old
// abstract shapes. Falls back to a category emoji for anything not listed.
const HOBBY_EMOJI = {
  basketball: "🏀", football: "⚽", badminton: "🏸", "table tennis": "🏓",
  running: "🏃", cycling: "🚴", swimming: "🏊", "rope skipping": "🪢",
  drawing: "🎨", watercolor: "🖌️", calligraphy: "🖌️", "paper cutting": "✂️",
  photography: "📷", origami: "🕊️", "clay modeling": "🏺", comics: "📖",
  piano: "🎹", guitar: "🎸", singing: "🎤", erhu: "🎻", flute: "🎶", drums: "🥁",
  reading: "📚", chess: "♟️", go: "⚫", journaling: "📓", puzzles: "🧩", "star gazing": "🔭",
  cooking: "🍳", baking: "🧁", gardening: "🌱", "tea making": "🍵",
  hiking: "🥾", fishing: "🎣", "bird watching": "🐦", "kite flying": "🪁",
  dancing: "💃", "jump rope tricks": "🤸", skateboarding: "🛹",
};
const CAT_EMOJI = { sport: "⚽", art: "🎨", music: "🎵", mind: "📚", food: "🍳", outdoor: "🌲", dance: "💃" };

export function hobbyEmoji(name, cat) {
  return HOBBY_EMOJI[String(name || "").toLowerCase()] || CAT_EMOJI[cat] || "🌱";
}

// A hobby picture: a soft gradient (by category) with the hobby's own emoji on
// a little white disc, so football / basketball / table tennis each read clearly.
export function scene(cat, seed, name) {
  const G = {
    sport:  ["#7FD6A0", "#2E9E63"],
    art:    ["#C9A8FF", "#7A4BD0"],
    music:  ["#8FC6FF", "#2C6FC9"],
    mind:   ["#A8B4FF", "#5A5AD0"],
    food:   ["#FFC98F", "#E07C2C"],
    outdoor:["#9BE0FF", "#3FA0D8"],
    dance:  ["#FFA6CE", "#D0468A"],
  };
  const g = G[cat] || G.mind;
  const id = "g" + cat + (seed || 0);
  const emoji = hobbyEmoji(name, cat);
  return '<svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="' + g[0] + '"/><stop offset="1" stop-color="' + g[1] + '"/></linearGradient></defs>' +
    '<rect width="100" height="60" fill="url(#' + id + ')"/>' +
    '<circle cx="50" cy="30" r="17" fill="rgba(255,255,255,.92)"/>' +
    '<text x="50" y="31" font-size="20" text-anchor="middle" dominant-baseline="central">' + emoji + '</text>' +
    '</svg>';
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
