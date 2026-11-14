// @vitest-environment jsdom
// The real store, end to end: real Dexie (on an in-memory IndexedDB), real
// React state, and a small in-memory stand-in for the server. What's tested
// is what a student would see — what's on screen, what survives a restart,
// and what reaches the server — not how the store gets there.
import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

const h = vi.hoisted(() => {
  const server = {
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
  const auth = { user: null };
  return { server, auth };
});

vi.mock("./AuthContext", () => ({ useAuth: () => ({ user: h.auth.user }) }));
vi.mock("../lib/remote", async () => {
  const { parseAvatar } = await import("../lib/parseAvatar");
  const s = h.server;
  const ok = () => vi.fn(async () => !s.fail);
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
  };
});

const { StoreProvider, useStore } = await import("./StoreContext");
const { clearAll, getAll, put } = await import("../db/db");

function mount() {
  return renderHook(() => useStore(), { wrapper: StoreProvider });
}
const tree = (id, extra = {}) => ({ id, name: id, createdAt: 1, updatedAt: 1, ...extra });

beforeEach(async () => {
  await clearAll();
  localStorage.clear();
  h.server.reset();
  h.auth.user = null;
});
afterEach(cleanup);

describe("store, signed out", () => {
  it("keeps what you plant across a restart", async () => {
    const first = mount();
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    act(() => first.result.current.addInterest(tree("piano")));
    expect(first.result.current.interests.map((i) => i.id)).toEqual(["piano"]);
    first.unmount();

    const again = mount();
    await waitFor(() => expect(again.result.current.interests.map((i) => i.id)).toEqual(["piano"]));
  });

  it("deletes a tree with its logs, and Recently Deleted brings them all back", async () => {
    await put("interests", tree("piano"));
    await put("entries", { id: "e1", interestId: "piano", date: "2026-11-01", minutes: 20 });
    const { result } = mount();
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    let undo;
    act(() => { undo = result.current.deleteInterest("piano"); });
    expect(result.current.interests).toEqual([]);
    expect(result.current.entries).toEqual([]);
    act(() => undo.commit());

    let trash;
    await waitFor(async () => {
      trash = await result.current.listTrash();
      expect(trash.map((t) => t.kind)).toEqual(["interest"]);
    });
    await act(() => result.current.restoreTrashed("interest", "piano"));
    expect(result.current.interests.map((i) => i.id)).toEqual(["piano"]);
    expect(result.current.entries.map((e) => e.id)).toEqual(["e1"]);
    expect(await result.current.listTrash()).toEqual([]);
  });

  it("logging earns coins", async () => {
    await put("meta", { key: "profile", name: "Mei", coins: 0 });
    await put("interests", tree("piano"));
    const { result } = mount();
    await waitFor(() => expect(result.current.profile).not.toBeNull());
    act(() => result.current.addEntry({ id: "e1", interestId: "piano", date: "2026-11-14", minutes: 15 }));
    expect(result.current.profile.coins).toBeGreaterThan(0);
  });
});

describe("store, signing in", () => {
  const row = {
    display_name: "Mei", onboarding_completed: true, created_at: "2026-01-01T00:00:00Z",
    coins: 40, lang: "en", theme: "light",
  };

  it("rebuilds a returning account on a wiped device", async () => {
    h.server.userRow = row;
    h.server.rows.interests = [tree("piano"), tree("old", { deletedAt: Date.now() })];
    h.auth.user = { id: "u1" };
    const { result } = mount();
    await waitFor(() => expect(result.current.profileCheck).toBe("done"));
    expect(result.current.profile).toMatchObject({ name: "Mei", coins: 40, userId: "u1" });
    await waitFor(() => expect(result.current.interests.map((i) => i.id)).toEqual(["piano"]));
    // The trashed one is stored for Recently Deleted, but not on screen.
    expect((await getAll("interests")).map((i) => i.id).sort()).toEqual(["old", "piano"]);
  });

  it("says so, instead of starting onboarding, when the server can't be reached", async () => {
    h.server.fail = true;
    h.auth.user = { id: "u1" };
    const { result } = mount();
    await waitFor(() => expect(result.current.profileCheck).toBe("failed"));
    expect(result.current.profile).toBeNull();
  });

  it("uploads what was planted offline, and pulls a newer edit down", async () => {
    await put("meta", { key: "profile", name: "Mei", userId: "u1", coins: 40 });
    await put("interests", tree("offline"));
    await put("interests", tree("shared", { name: "old name", updatedAt: 1 }));
    h.server.userRow = row;
    h.server.rows.interests = [tree("shared", { name: "new name", updatedAt: 5 })];
    h.auth.user = { id: "u1" };
    const { result } = mount();
    await waitFor(() => expect(h.server.rows.interests.map((i) => i.id).sort()).toEqual(["offline", "shared"]));
    await waitFor(() => expect(result.current.interests.find((i) => i.id === "shared").name).toBe("new name"));
  });

  it("erases a tree here that was erased on another device", async () => {
    await put("meta", { key: "profile", name: "Mei", userId: "u1", coins: 40 });
    await put("interests", tree("erased"));
    localStorage.setItem("forest.seenRemote.u1", JSON.stringify(["interests:erased"]));
    h.server.userRow = row;
    h.auth.user = { id: "u1" };
    const { result } = mount();
    await waitFor(() => expect(result.current.profileCheck).toBe("done"));
    await waitFor(async () => expect(await getAll("interests")).toEqual([]));
    expect(result.current.interests).toEqual([]);
    expect(h.server.rows.interests).toEqual([]);
  });

  it("remembers a failed push and retries it", async () => {
    await put("meta", { key: "profile", name: "Mei", userId: "u1", coins: 40 });
    h.server.userRow = row;
    h.auth.user = { id: "u1" };
    const { result } = mount();
    await waitFor(() => expect(result.current.profileCheck).toBe("done"));

    h.server.fail = true;
    act(() => result.current.addInterest(tree("piano")));
    await waitFor(() => expect(result.current.pendingSyncCount).toBe(1));

    h.server.fail = false;
    act(() => result.current.retrySync());
    await waitFor(() => expect(result.current.pendingSyncCount).toBe(0));
    expect(h.server.rows.interests.map((i) => i.id)).toEqual(["piano"]);
  });
});
