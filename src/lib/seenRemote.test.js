import { describe, it, expect, beforeEach } from "vitest";
import { loadSeen, saveSeen, forgetSeen, splitLocalOnly } from "./seenRemote";

describe("splitLocalOnly", () => {
  const local = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const remote = [{ id: "a" }];

  it("uploads what never reached the server and erases what was erased there", () => {
    const seen = new Set(["interests:b"]);
    const { push, drop } = splitLocalOnly("interests", local, remote, seen, true);
    expect(drop.map((r) => r.id)).toEqual(["b"]);
    expect(push.map((r) => r.id)).toEqual(["c"]);
  });

  it("erases nothing when the server's list came back incomplete", () => {
    const seen = new Set(["interests:b", "interests:c"]);
    const { push, drop } = splitLocalOnly("interests", local, [], seen, false);
    expect(drop).toEqual([]);
    expect(push.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps stores apart", () => {
    const seen = new Set(["entries:b"]);
    expect(splitLocalOnly("interests", local, remote, seen, true).drop).toEqual([]);
  });
});

describe("seen list storage", () => {
  const store = {};
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    };
  });

  it("round-trips per account and forgets on request", () => {
    saveSeen("u1", new Set(["interests:a", "photos:p"]));
    expect([...loadSeen("u1")].sort()).toEqual(["interests:a", "photos:p"]);
    expect(loadSeen("u2").size).toBe(0);
    forgetSeen("u1");
    expect(loadSeen("u1").size).toBe(0);
  });

  it("treats a damaged list as empty, which only ever means uploading", () => {
    store["forest.seenRemote.u1"] = "{not json";
    expect(loadSeen("u1").size).toBe(0);
  });
});
