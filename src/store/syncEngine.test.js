import { describe, it, expect, vi, beforeEach } from "vitest";

// The real modules open IndexedDB and a Supabase client on import; the engine
// takes its dependencies as arguments, so these never need to load.
vi.mock("../db/db", () => ({}));
vi.mock("../lib/remote", () => ({}));

const { createSyncEngine } = await import("./syncEngine");

function harness({ pending = [], records = {}, remoteOk = true } = {}) {
  const state = {
    pending: new Set(pending),
    photos: [], entries: [],
    dexie: { interests: new Map(), entries: new Map(), photos: new Map() },
  };
  for (const [store, rows] of Object.entries(records)) rows.forEach((r) => state.dexie[store].set(r.id, r));
  const pendingSyncRef = { current: state.pending };
  const local = {
    get: async (s, id) => state.dexie[s].get(id),
    put: async (s, r) => { state.dexie[s].set(r.id, r); },
    getAll: async (s) => Array.from(state.dexie[s].values()),
  };
  const calls = [];
  const ok = (name) => vi.fn(async (...args) => { calls.push([name, ...args]); return remoteOk; });
  const remote = {
    pushInterest: ok("pushInterest"),
    pushEntry: ok("pushEntry"),
    pushPhotoRow: ok("pushPhotoRow"),
    uploadPhotoBlob: vi.fn(async (_u, id) => (remoteOk ? `u/${id}.jpg` : null)),
    uploadAudioBlob: vi.fn(async (_u, id) => (remoteOk ? `u/${id}.m4a` : null)),
    updateDiscovery: ok("updateDiscovery"),
    updateSoundOn: ok("updateSoundOn"),
    updateLang: ok("updateLang"),
    updateTheme: ok("updateTheme"),
    updateEquippedDecoration: ok("updateEquippedDecoration"),
    updateAvatar: ok("updateAvatar"),
  };
  const engine = createSyncEngine({
    userRef: { current: { id: "u1" } },
    profileRef: { current: { lang: "zh" } },
    pendingSyncRef,
    seenRef: { current: { userId: null, keys: new Set() } },
    setPendingSyncIds: (fn) => { state.pending = fn(state.pending); pendingSyncRef.current = state.pending; },
    setPhotos: (fn) => { state.photos = fn(state.photos); },
    setEntries: (fn) => { state.entries = fn(state.entries); },
    local, remote,
  });
  return { engine, state, remote, calls };
}

describe("sync engine", () => {
  beforeEach(() => vi.useRealTimers());

  it("tracks a failed push as pending and clears it once it lands", async () => {
    const h = harness({ remoteOk: false });
    await h.engine.pushInterest({ id: "t1" }, "u1");
    expect(h.state.pending.has("interests:t1")).toBe(true);
    h.remote.pushInterest.mockResolvedValue(true);
    await h.engine.pushInterest({ id: "t1" }, "u1");
    expect(h.state.pending.has("interests:t1")).toBe(false);
  });

  it("keeps an entry pending while its recording hasn't reached Storage", async () => {
    const h = harness();
    await h.engine.pushEntry({ id: "e1", audio: new Blob(["x"]) });
    expect(h.state.pending.has("entries:e1")).toBe(true);
  });

  it("uploads a photo's bytes, then pushes the row with its path", async () => {
    const rec = { id: "p1", blob: new Blob(["x"]) };
    const h = harness({ records: { photos: [rec] } });
    h.state.photos = [rec];
    await h.engine.uploadPhotoFile(rec, "u1");
    expect(h.state.dexie.photos.get("p1").storagePath).toBe("u/p1.jpg");
    expect(h.state.photos[0].storagePath).toBe("u/p1.jpg");
    expect(h.remote.pushPhotoRow).toHaveBeenLastCalledWith(expect.objectContaining({ id: "p1", storagePath: "u/p1.jpg" }));
  });

  it("doesn't write back a photo erased while it was uploading", async () => {
    const h = harness();
    await h.engine.uploadPhotoFile({ id: "gone", blob: new Blob(["x"]) }, "u1");
    expect(h.remote.pushPhotoRow).not.toHaveBeenCalled();
    expect(h.state.dexie.photos.has("gone")).toBe(false);
  });

  it("pushes a removed recording's entry without a path", async () => {
    const h = harness({ records: { entries: [{ id: "e1" }] } });
    await h.engine.uploadEntryAudio({ id: "e1", audio: new Blob(["x"]) }, "u1");
    expect(h.remote.pushEntry).toHaveBeenCalledWith({ id: "e1" });
  });

  it("retries each pending record from its current copy", async () => {
    const h = harness({
      pending: ["interests:t1", "entries:e1", "photos:p1", "entries:gone", "profile:lang"],
      records: {
        interests: [{ id: "t1", name: "now" }],
        entries: [{ id: "e1", audio: new Blob(["x"]) }],
        photos: [{ id: "p1", storagePath: "u/p1.jpg" }],
      },
    });
    await h.engine.retryPending();
    expect(h.remote.pushInterest).toHaveBeenCalledWith({ id: "t1", name: "now" }, "u1");
    expect(h.remote.uploadAudioBlob).toHaveBeenCalled();
    expect(h.remote.pushPhotoRow).toHaveBeenCalledWith({ id: "p1", storagePath: "u/p1.jpg" });
    expect(h.remote.updateLang).toHaveBeenCalledWith("u1", "zh");
    expect(Array.from(h.state.pending)).toEqual([]);
  });

  it("drops an unknown profile field instead of retrying it forever", async () => {
    const h = harness({ pending: ["profile:nonsense"] });
    await h.engine.retryPending();
    expect(h.state.pending.size).toBe(0);
  });

  it("does nothing signed out", async () => {
    const h = harness({ pending: ["interests:t1"], records: { interests: [{ id: "t1" }] } });
    const signedOut = createSyncEngine({
      userRef: { current: null }, profileRef: { current: null },
      pendingSyncRef: { current: new Set(["interests:t1"]) },
      seenRef: { current: { userId: null, keys: new Set() } },
      setPendingSyncIds: () => {}, setPhotos: () => {}, setEntries: () => {},
      local: { getAll: async () => [] }, remote: h.remote,
    });
    await signedOut.retryPending();
    expect(await signedOut.pushProfileField("lang", "en")).toBe(false);
    expect(h.remote.pushInterest).not.toHaveBeenCalled();
  });
});
