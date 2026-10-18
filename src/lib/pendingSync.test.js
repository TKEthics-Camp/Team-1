import { describe, it, expect, beforeEach } from "vitest";
import { loadPendingSync, savePendingSync, forgetPendingSync } from "./pendingSync";

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
  };
}

describe("pendingSync", () => {
  beforeEach(() => {
    globalThis.localStorage = memoryStorage();
  });

  it("round-trips the keys for one account", () => {
    savePendingSync("u1", new Set(["entries:a", "profile:theme"]));
    expect(loadPendingSync("u1").sort()).toEqual(["entries:a", "profile:theme"]);
  });

  it("keeps accounts apart", () => {
    savePendingSync("u1", ["entries:a"]);
    expect(loadPendingSync("u2")).toEqual([]);
  });

  it("clears the saved list when nothing is pending", () => {
    savePendingSync("u1", ["entries:a"]);
    savePendingSync("u1", new Set());
    expect(localStorage.getItem("forest.pendingSync.u1")).toBeNull();
  });

  it("forgets an account's list", () => {
    savePendingSync("u1", ["photos:p"]);
    forgetPendingSync("u1");
    expect(loadPendingSync("u1")).toEqual([]);
  });

  it("ignores garbage rather than throwing", () => {
    localStorage.setItem("forest.pendingSync.u1", "{not json");
    expect(loadPendingSync("u1")).toEqual([]);
    localStorage.setItem("forest.pendingSync.u1", JSON.stringify([1, "nocolon", "entries:ok"]));
    expect(loadPendingSync("u1")).toEqual(["entries:ok"]);
  });

  it("survives storage that refuses writes", () => {
    globalThis.localStorage = {
      getItem: () => null,
      setItem: () => { throw new Error("quota"); },
      removeItem: () => { throw new Error("quota"); },
    };
    expect(() => savePendingSync("u1", ["entries:a"])).not.toThrow();
    expect(() => forgetPendingSync("u1")).not.toThrow();
  });
});
