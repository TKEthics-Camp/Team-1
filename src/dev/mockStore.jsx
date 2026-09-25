// Stands in for store/StoreContext in the design preview only (see
// vite.preview.config.js). Realistic sample data, and every action a no-op,
// so screens render exactly as they would for a student three weeks in —
// without a login, a network, or touching anybody's real account.
const day = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const t = (n) => Date.now() - n * 86400000;

const interests = [
  { id: "i1", name: "Calligraphy", nameZh: "书法", why: "Grandpa taught me", color: "#5AA8F2", days: [], species: "pine", leafColor: "green", createdAt: t(24), updatedAt: t(1) },
  { id: "i2", name: "Running", nameZh: "跑步", why: "", color: "#FF7A6B", days: [1, 3, 5], species: "oak", leafColor: "green", createdAt: t(18), updatedAt: t(2) },
  { id: "i3", name: "Guitar", nameZh: "吉他", why: "", color: "#B48CF2", days: [], species: "cherry", leafColor: "red", createdAt: t(9), updatedAt: t(0) },
];

const texts = [
  "Practised the horizontal stroke until it stopped wobbling.",
  "Ran to the river and back. Legs are tired.",
  "Learned the first four chords of a new song.",
  "Wrote my name ten times — the last one was the best.",
  "Short run in the rain.",
];
const entries = [];
let n = 0;
for (let d = 0; d < 21; d++) {
  for (const it of interests) {
    if ((d + it.id.charCodeAt(1)) % 3 === 0 && t(d) >= it.createdAt) {
      entries.push({
        id: "e" + n, interestId: it.id, date: day(d), text: texts[n % texts.length],
        minutes: 15 + (n % 4) * 10, visibility: n % 5 === 0 ? "public" : "private",
        isPinned: false, createdAt: t(d), updatedAt: t(d),
      });
      n++;
    }
  }
}

const profile = {
  name: "Lin", avatar: null, theme: "white", lang: "en", coins: 85,
  accountType: "individual", equippedDecoration: null, soundOn: true,
  discoverable: false, classCode: null, onboardingCompleted: true,
};

const noop = () => {};
const actions = new Proxy({}, {
  get: (_, key) => {
    if (typeof key !== "string") return undefined;
    if (key.startsWith("delete")) return () => ({ restore: noop, commit: noop });
    return async () => ({ ok: true });
  },
});

export function StoreProvider({ children }) { return children; }

export function useStore() {
  return new Proxy(
    { loading: false, profile, interests, entries, photos: [], pendingSyncCount: 0 },
    { get: (o, k) => (k in o ? o[k] : actions[k]) },
  );
}
