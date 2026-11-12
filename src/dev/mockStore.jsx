// Stands in for store/StoreContext in the design preview only (see
// vite.preview.config.js). Realistic sample data held in memory, so screens
// render exactly as they would for a student three weeks in — without a
// login, a network, or touching anybody's real account.
import { useSyncExternalStore } from "react";
import { dateKey } from "../lib/dates";
// Local day keys, like the app's own (lib/dates): a UTC date would put
// "today's" sample entry on yesterday for half the day east of Greenwich.
const day = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateKey(d);
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
        minutes: 15 + (n % 4) * 15, visibility: n % 5 === 0 ? "public" : "private",
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

// The preview is interactive: the actions a screen actually calls change this
// in-memory copy, so logging, planting and deleting can be tried end to end.
// Nothing is saved — a reload is back to the sample garden. Anything not
// listed here stays a harmless no-op.
let state = { profile, interests, entries, photos: [] };
const listeners = new Set();
function set(patch) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
}
const noop = () => {};
const stamp = (rec) => ({ ...rec, updatedAt: Date.now() });
function hide(key, id, also = () => ({})) {
  const removed = state[key].find((r) => r.id === id) || null;
  const before = state;
  set({ [key]: state[key].filter((r) => r.id !== id), ...also() });
  return { record: removed, commit: noop, restore: () => set({ [key]: before[key], entries: before.entries, photos: before.photos }) };
}
const real = {
  addEntry: (rec) => set({ entries: [...state.entries, rec], profile: { ...state.profile, coins: state.profile.coins + 5 } }),
  updateEntry: (rec) => set({ entries: state.entries.map((e) => (e.id === rec.id ? stamp(rec) : e)) }),
  deleteEntry: (id) => hide("entries", id),
  addPhoto: (rec) => set({ photos: [...state.photos, rec], profile: { ...state.profile, coins: state.profile.coins + 5 } }),
  deletePhoto: (id) => hide("photos", id),
  addInterest: (rec) => set({ interests: [...state.interests, rec] }),
  updateInterest: (rec) => set({ interests: state.interests.map((i) => (i.id === rec.id ? stamp(rec) : i)) }),
  deleteInterest: (id) => hide("interests", id, () => ({
    entries: state.entries.filter((e) => e.interestId !== id),
    photos: state.photos.filter((p) => p.interestId !== id),
  })),
  updateProfile: (patch) => set({ profile: { ...state.profile, ...patch } }),
  setDiscoverable: (v) => set({ profile: { ...state.profile, discoverable: v } }),
  setLangOnProfile: (lang) => set({ profile: { ...state.profile, lang } }),
};
const actions = new Proxy({}, {
  get: (_, key) => {
    if (typeof key !== "string") return undefined;
    if (real[key]) return real[key];
    if (key.startsWith("delete")) return () => ({ restore: noop, commit: noop });
    return async () => ({ ok: true });
  },
});

export function StoreProvider({ children }) { return children; }

export function useStore() {
  const s = useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    () => state,
  );
  return new Proxy(
    { loading: false, ...s, pendingSyncCount: 0 },
    { get: (o, k) => (k in o ? o[k] : actions[k]) },
  );
}
