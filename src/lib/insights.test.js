import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  activityByDay, weekStart, weekStrip, weeklyMinutes, heatmap, byHobby, bestWeekday, bestRun, summary,
} from "./insights";
import { dateKey } from "./dates";

// Tue 10 Mar 2026, noon local — the Monday of that week is 9 Mar.
const NOW = new Date(2026, 2, 10, 12, 0, 0);

function ago(n) {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d;
}
const key = (n) => dateKey(ago(n));
const entry = (n, minutes = 30, interestId = "a") => ({
  id: "e" + n + interestId + minutes, interestId, date: key(n), minutes, createdAt: ago(n).getTime(),
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("activityByDay", () => {
  it("adds up a day's minutes and counts a photo as showing up", () => {
    const days = activityByDay([entry(0, 30), entry(0, 15)], [{ interestId: "a", createdAt: ago(1).getTime() }]);
    expect(days.get(key(0))).toEqual({ minutes: 45, logs: 2 });
    expect(days.get(key(1))).toEqual({ minutes: 0, logs: 1 });
  });
});

describe("weekStart", () => {
  it("is the Monday of the week, including for a Sunday", () => {
    expect(dateKey(weekStart(NOW))).toBe("2026-03-09");
    expect(dateKey(weekStart(new Date(2026, 2, 15, 23, 0)))).toBe("2026-03-09");
    expect(dateKey(weekStart(new Date(2026, 2, 9, 0, 0)))).toBe("2026-03-09");
  });
});

describe("weekStrip", () => {
  it("runs Monday to Sunday and marks logged days, today and the future", () => {
    const strip = weekStrip([entry(1), entry(0, 20)], [], NOW);
    expect(strip).toHaveLength(7);
    expect(strip[0]).toMatchObject({ key: "2026-03-09", dow: 1, logged: true, isToday: false, isFuture: false });
    expect(strip[1]).toMatchObject({ key: "2026-03-10", logged: true, minutes: 20, isToday: true });
    expect(strip[2]).toMatchObject({ logged: false, isFuture: true });
    expect(strip[6]).toMatchObject({ key: "2026-03-15", dow: 0 });
  });

  it("leaves last week's logs out", () => {
    expect(weekStrip([entry(3)], [], NOW).some((d) => d.logged)).toBe(false);
  });
});

describe("weeklyMinutes", () => {
  it("totals each week, oldest first, ending with this one", () => {
    const weeks = weeklyMinutes([entry(0, 30), entry(1, 45), entry(3, 20), entry(20, 60)], NOW, 4);
    // 20 days back is Wed 18 Feb, in the week of the 16th: the first column.
    expect(weeks.map((w) => w.minutes)).toEqual([60, 0, 20, 75]);
    expect(weeks[3].start).toBe("2026-03-09");
  });
});

describe("heatmap", () => {
  it("is weeks of seven days, the last column holding today", () => {
    const cols = heatmap([], [], NOW, 15);
    expect(cols).toHaveLength(15);
    expect(cols.every((c) => c.length === 7)).toBe(true);
    expect(cols[14][1].key).toBe("2026-03-10");
  });

  it("grades a day by its minutes and leaves the future blank", () => {
    const cols = heatmap(
      [entry(0, 10), entry(1, 30), entry(7, 60)],
      [{ interestId: "a", createdAt: ago(8).getTime() }],
      NOW, 3,
    );
    expect(cols[2][1].level).toBe(1);   // today, 10 min
    expect(cols[2][0].level).toBe(2);   // Monday, 30 min
    expect(cols[1][1].level).toBe(3);   // last Tuesday, an hour
    expect(cols[1][0].level).toBe(1);   // a photo alone still shows
    expect(cols[2][2].level).toBe(-1);  // tomorrow
    expect(cols[0][3].level).toBe(0);
  });
});

describe("byHobby", () => {
  const interests = [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "c", name: "C" }];
  it("ranks by time in the window and still lists hobbies with none", () => {
    const rows = byHobby(interests, [entry(0, 30, "a"), entry(2, 90, "b"), entry(45, 500, "c")], [], NOW, 30);
    expect(rows.map((r) => r.interest.id)).toEqual(["b", "a", "c"]);
    expect(rows[2]).toMatchObject({ minutes: 0, logs: 0 });
  });
  it("counts photos as logs", () => {
    const rows = byHobby(interests, [], [{ interestId: "c", createdAt: ago(1).getTime() }], NOW, 30);
    expect(rows[0]).toMatchObject({ minutes: 0, logs: 1 });
    expect(rows[0].interest.id).toBe("c");
  });
});

describe("bestWeekday", () => {
  it("says nothing until there are enough days", () => {
    expect(bestWeekday([entry(0), entry(1)], [])).toBeNull();
  });
  it("names the weekday with the most active days", () => {
    // Tuesdays: today and the two before it, plus two other days.
    expect(bestWeekday([entry(0), entry(7), entry(14), entry(1), entry(3)], [])).toBe(2);
  });
});

describe("bestRun", () => {
  it("counts logged days and forgives one missed day, like the streak", () => {
    // three days, one missed, two more: five logged days in one streak
    expect(bestRun([entry(9), entry(8), entry(7), entry(5), entry(4)], [])).toBe(5);
    expect(bestRun([], [])).toBe(0);
  });
  it("breaks on a second miss inside the same week", () => {
    // logged, miss, logged, miss, logged: the second gap comes too soon
    expect(bestRun([entry(9), entry(7), entry(5)], [])).toBe(2);
  });
  it("breaks on two missed days in a row", () => {
    expect(bestRun([entry(9), entry(8), entry(5), entry(4), entry(3)], [])).toBe(3);
  });
  it("runs across a month boundary", () => {
    const e = (y, m, d) => ({ id: `${m}-${d}`, interestId: "a", date: dateKey(new Date(y, m, d)), minutes: 10 });
    expect(bestRun([e(2026, 0, 30), e(2026, 0, 31), e(2026, 1, 1), e(2026, 1, 2)], [])).toBe(4);
  });
});

describe("summary", () => {
  it("gathers the headline numbers", () => {
    const s = summary([entry(0, 30), entry(1, 30), entry(8, 45)], [], NOW);
    expect(s).toMatchObject({
      streak: 2, bestRun: 2, activeDays: 3, totalMinutes: 105, weekMinutes: 60, lastWeekMinutes: 45,
    });
  });

  it("never reports a best streak shorter than the current one", () => {
    // today, yesterday, a rest day, then two more: a streak of four
    const s = summary([entry(0), entry(1), entry(3), entry(4)], [], NOW);
    expect(s.streak).toBe(4);
    expect(s.bestRun).toBeGreaterThanOrEqual(s.streak);
  });
});
