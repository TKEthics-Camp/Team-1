// An in-memory stand-in for the Supabase side of lib/remote, for tests that
// run the real store. Rows land in `server.rows` the way the real tables
// would hold them; `server.fail` makes every call fail like a dropped
// connection. Use with:
//   vi.mock("../lib/remote", async () => (await import("../test/fakeServer")).remoteModule());
import { vi } from "vitest";
import { parseAvatar } from "../lib/parseAvatar";

export const server = {
  userRow: null,
  rows: { interests: [], entries: [], photos: [] },
  fail: false,
  reset() {
    this.userRow = null;
    this.rows = { interests: [], entries: [], photos: [] };
    this.fail = false;
  },
  upsert(store, rec) {
    if (this.fail) return false;
    const list = this.rows[store];
    const i = list.findIndex((r) => r.id === rec.id);
    if (i >= 0) list[i] = { ...rec }; else list.push({ ...rec });
    return true;
  },
};

export function remoteModule() {
  const s = server;
  const ok = () => vi.fn(async () => !s.fail);
  const nothing = () => vi.fn(async () => null);
  return {
    parseAvatar,
    pullUserRow: vi.fn(async () => (s.fail ? null : s.userRow)),
    pullMine: vi.fn(async () => (s.fail
      ? { interests: [], entries: [], photos: [], complete: false }
      : { interests: [...s.rows.interests], entries: [...s.rows.entries], photos: [...s.rows.photos], complete: true })),
    pushInterest: vi.fn(async (rec) => s.upsert("interests", rec)),
    pushEntry: vi.fn(async (rec) => s.upsert("entries", { ...rec, audio: undefined })),
    pushPhotoRow: vi.fn(async (rec) => s.upsert("photos", { ...rec, blob: undefined })),
    uploadPhotoBlob: vi.fn(async (_u, id) => (s.fail ? null : `u/${id}.jpg`)),
    uploadAudioBlob: vi.fn(async (_u, id) => (s.fail ? null : `u/${id}.m4a`)),
    deleteRemoteInterest: ok(), deleteRemoteEntry: ok(), deleteRemotePhoto: ok(), deleteAllMine: ok(),
    updateDisplayName: vi.fn(async () => ({ ok: true })),
    syncLoginToUsername: vi.fn(async () => ({ ok: true })),
    joinClass: vi.fn(async () => "joined"),
    setMyClassCode: ok(), updateCoins: ok(),
    updateOwnedDecorations: ok(), updateOwnedHair: ok(), updateOwnedOutfits: ok(),
    updateDiscovery: ok(), updateSoundOn: ok(), updateLang: ok(), updateTheme: ok(),
    updateEquippedDecoration: ok(), updateAvatar: ok(),
    removeVoiceNoteFile: ok(),
    markOnboardingComplete: vi.fn(async () => { if (s.userRow) s.userRow.onboarding_completed = true; return !s.fail; }),
    mintOrFetchClassCode: vi.fn(async () => (s.fail ? null : "CLASS1")),
    // Explore and other screens read these; an empty answer is enough.
    pullFeed: nothing(), pullWatchedInterests: nothing(), searchUsers: nothing(),
    pullPublicProfile: nothing(), pullClassmates: nothing(),
  };
}

// jsdom leaves these out; the screens only use them for polish.
export function stubBrowser() {
  window.matchMedia ||= /** @type {any} */ (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  window.IntersectionObserver ||= /** @type {any} */ (class { observe() {} unobserve() {} disconnect() {} });
  window.ResizeObserver ||= /** @type {any} */ (class { observe() {} unobserve() {} disconnect() {} });
  window.scrollTo = () => {};
  HTMLElement.prototype.scrollIntoView ||= () => {};
  HTMLElement.prototype.setPointerCapture ||= () => {};
}
