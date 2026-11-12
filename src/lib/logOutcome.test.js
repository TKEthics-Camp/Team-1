import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { logOutcome, usualMinutes } from "./logOutcome";
import { dateKey } from "./dates";

const NOW = new Date(2026, 2, 10, 12, 0, 0);
const ago = (n) => { const d = new Date(NOW); d.setDate(d.getDate() - n); return d; };
const tree = { id: "x", createdAt: ago(30).getTime() };
const log = (n, i = 0, minutes = 30) => ({
  id: `e${n}-${i}`, interestId: "x", date: dateKey(ago(n)), minutes, createdAt: ago(n).getTime() + i,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("logOutcome", () => {
  it("moves the bar without growing the tree", () => {
    const o = logOutcome(tree, [log(1)], [], { entry: log(0) });
    expect(o.leveledUp).toBe(false);
    expect(o.before.ratio).toBeCloseTo(0.2);
    expect(o.after.ratio).toBeCloseTo(0.4);
  });

  it("notices the log that reaches the next stage", () => {
    const four = [log(1, 0), log(1, 1), log(1, 2), log(1, 3)];
    const o = logOutcome(tree, four, [], { entry: log(0) });
    expect(o.leveledUp).toBe(true);
    expect(o.before.stage).toBe(0);
    expect(o.after.stage).toBe(1);
  });

  it("counts a photo the same way", () => {
    const o = logOutcome(tree, [], [], { photo: { id: "p", interestId: "x", createdAt: NOW.getTime() } });
    expect(o.after.acts).toBe(1);
    expect(o.streakGrew).toBe(true);
  });

  it("ticks the streak on the first log of the day, not the second", () => {
    expect(logOutcome(tree, [log(1)], [], { entry: log(0) })).toMatchObject({ streak: 2, streakGrew: true });
    expect(logOutcome(tree, [log(1), log(0)], [], { entry: log(0, 1) })).toMatchObject({ streak: 2, streakGrew: false });
  });

  it("doesn't claim a streak for a log dated in the past", () => {
    expect(logOutcome(tree, [], [], { entry: log(5) })).toMatchObject({ streak: 0, streakGrew: false });
  });
});

describe("usualMinutes", () => {
  it("offers the most recently logged duration for that hobby", () => {
    const entries = [log(3, 0, 45), log(1, 0, 60), { ...log(0, 0, 15), interestId: "other" }];
    expect(usualMinutes(entries, "x")).toBe(60);
  });
  it("falls back when the hobby has no timed log yet", () => {
    expect(usualMinutes([], "x")).toBe(30);
    expect(usualMinutes([{ ...log(0), minutes: 0 }], "x", 20)).toBe(20);
  });
});
