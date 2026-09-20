import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { streakDetail, globalStreakDetail, fmtHours, entriesOf, minutesOf } from "./derived";
import { dateKey } from "./dates";

// streakDetail walks back from "today", so every test here pins the clock.
// Noon on purpose: a time near midnight would let a test pass or fail on
// which side of the boundary the machine running it happens to be.
const NOW = new Date(2026, 2, 10, 12, 0, 0); // Tue 10 Mar 2026, local

// n days before the pinned today, as a day key.
function ago(n) {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return dateKey(d);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("streakDetail", () => {
  it("counts consecutive days ending today", () => {
    expect(streakDetail([ago(0), ago(1), ago(2)])).toEqual({
      streak: 3, rests: 0, restingNow: false,
    });
  });

  it("keeps the streak alive on a day that hasn't been logged yet", () => {
    // Today being empty at noon isn't a miss — the day isn't over.
    expect(streakDetail([ago(1), ago(2)]).streak).toBe(2);
  });

  it("is zero with nothing logged at all", () => {
    expect(streakDetail([])).toEqual({ streak: 0, rests: 0, restingNow: false });
  });

  it("ignores duplicate logs on the same day", () => {
    expect(streakDetail([ago(0), ago(0), ago(0), ago(1)]).streak).toBe(2);
  });

  it("forgives one missed day and keeps counting past it", () => {
    // logged 0,1, missed 2, logged 3,4
    const d = streakDetail([ago(0), ago(1), ago(3), ago(4)]);
    expect(d.streak).toBe(4); // the rest day itself is not counted
    expect(d.rests).toBe(1);
  });

  it("breaks on a second miss inside the rest window", () => {
    // misses at 2 and 4 are only 2 days apart, well inside REST_EVERY_DAYS
    expect(streakDetail([ago(0), ago(1), ago(3), ago(5), ago(6)]).streak).toBe(3);
  });

  it("breaks an every-other-day pattern rather than forgiving it forever", () => {
    // The whole point of the rest rule: showing up must stay the thing that
    // keeps a streak alive, so alternating days must not sustain one.
    const alternating = [0, 2, 4, 6, 8, 10, 12].map(ago);
    expect(streakDetail(alternating).streak).toBe(2);
  });

  it("allows a second rest once the window has passed", () => {
    // misses at 3 and 11 — 8 apart, so both are affordable
    const dates = [0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 12, 13].map(ago);
    const d = streakDetail(dates);
    expect(d.rests).toBe(2);
    expect(d.streak).toBe(12);
  });

  it("does not report a rest it never actually spent", () => {
    // The walk always ends by spending a rest on the day after the oldest
    // entry. That one bridges nothing, and counting it made an unbroken
    // streak claim it had used a rest day.
    expect(streakDetail([ago(0), ago(1), ago(2)]).rests).toBe(0);
  });

  it("flags restingNow while a rest is bridging the gap right behind today", () => {
    // logged today, missed yesterday, streak continues behind it
    const d = streakDetail([ago(0), ago(2), ago(3)]);
    expect(d).toEqual({ streak: 3, rests: 1, restingNow: true });
  });

  it("does not flag restingNow for an older rest", () => {
    expect(streakDetail([ago(0), ago(1), ago(2), ago(4), ago(5)]).restingNow).toBe(false);
  });

  it("ends the streak when today and yesterday are both empty", () => {
    // A rest only ever protects a streak that's already running: the walk
    // starts at yesterday when today is empty, and finding nothing there
    // means there's nothing to protect yet. Two silent days ends it.
    expect(streakDetail([ago(2), ago(3)]).streak).toBe(0);
  });
});

describe("globalStreakDetail", () => {
  it("counts entries and photos toward the same single streak", () => {
    const entries = [{ date: ago(0) }];
    const photos = [{ createdAt: new Date(NOW).setDate(NOW.getDate() - 1) }];
    expect(globalStreakDetail(entries, photos).streak).toBe(2);
  });

  it("treats a photo as keeping the day alive on its own", () => {
    const photos = [0, 1, 2].map((n) => ({
      createdAt: new Date(new Date(NOW).setDate(NOW.getDate() - n)).getTime(),
    }));
    expect(globalStreakDetail([], photos).streak).toBe(3);
  });
});

describe("entriesOf / minutesOf", () => {
  const entries = [
    { id: "a", interestId: "x", date: "2026-03-01", minutes: 30, createdAt: 1 },
    { id: "b", interestId: "x", date: "2026-03-03", minutes: 45, createdAt: 2 },
    { id: "c", interestId: "y", date: "2026-03-02", minutes: 60, createdAt: 3 },
  ];

  it("keeps one hobby's entries apart from another's, newest first", () => {
    expect(entriesOf(entries, "x").map((e) => e.id)).toEqual(["b", "a"]);
  });

  it("sums only the matching hobby's minutes", () => {
    expect(minutesOf(entries, "x")).toBe(75);
    expect(minutesOf(entries, "y")).toBe(60);
    expect(minutesOf(entries, "nope")).toBe(0);
  });

  it("treats an entry with no minutes as zero rather than NaN", () => {
    expect(minutesOf([{ interestId: "x", date: "2026-03-01", createdAt: 1 }], "x")).toBe(0);
  });
});

describe("fmtHours", () => {
  it("stays in minutes under an hour", () => {
    expect(fmtHours(0)).toBe("0h");
    expect(fmtHours(45)).toBe("45m");
  });

  it("shows one decimal below ten hours and rounds above", () => {
    expect(fmtHours(90)).toBe("1.5h");
    expect(fmtHours(60)).toBe("1h");
    expect(fmtHours(6000)).toBe("100h");
  });
});
