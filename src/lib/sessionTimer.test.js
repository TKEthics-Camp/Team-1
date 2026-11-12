import { describe, it, expect, beforeEach } from "vitest";
import {
  loadSession, saveSession, clearSession, elapsedMs, sessionMinutes, fmtElapsed, MAX_SESSION_MINUTES,
} from "./sessionTimer";

const MIN = 60000;

describe("session timer maths", () => {
  const session = { interestId: "x", startedAt: 1_000_000 };

  it("works the time out from the clock, never below zero", () => {
    expect(elapsedMs(session, 1_000_000 + 5 * MIN)).toBe(5 * MIN);
    expect(elapsedMs(session, 999_000)).toBe(0);
  });

  it("offers at least a minute and rounds to the nearest", () => {
    expect(sessionMinutes(session, 1_000_000 + 5000)).toBe(1);
    expect(sessionMinutes(session, 1_000_000 + 22.4 * MIN)).toBe(22);
    expect(sessionMinutes(session, 1_000_000 + 22.6 * MIN)).toBe(23);
  });

  it("stops growing for a timer left running", () => {
    expect(sessionMinutes(session, 1_000_000 + 30 * 60 * MIN)).toBe(MAX_SESSION_MINUTES);
  });

  it("formats like a stopwatch", () => {
    expect(fmtElapsed(0)).toBe("0:00");
    expect(fmtElapsed(247_000)).toBe("4:07");
    expect(fmtElapsed(3_765_000)).toBe("1:02:45");
  });
});

describe("session timer storage", () => {
  const store = {};
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    };
  });

  it("survives a reload and clears on request", () => {
    saveSession({ interestId: "x", startedAt: 500 });
    expect(loadSession(1000)).toEqual({ interestId: "x", startedAt: 500 });
    clearSession();
    expect(loadSession(1000)).toBeNull();
  });

  it("ignores a damaged record or a start time in the future", () => {
    store["forest.session"] = "{nope";
    expect(loadSession(1000)).toBeNull();
    store["forest.session"] = JSON.stringify({ interestId: 7, startedAt: 1 });
    expect(loadSession(1000)).toBeNull();
    store["forest.session"] = JSON.stringify({ interestId: "x", startedAt: 10 * 60 * MIN });
    expect(loadSession(1000)).toBeNull();
  });
});
