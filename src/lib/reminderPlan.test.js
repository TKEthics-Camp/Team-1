import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { planReminders } from "./reminderPlan";

const t = (k) => ({
  appName: "Forest",
  nudgeSolo: "You set aside this time for it.",
  nudgeManyTitle: "Today's hobbies",
  dyingTitle: "{name} is nearly gone",
  dyingOneDay: "1 day left",
}[k] || k);
const nameOf = (it) => it.name;

// Wednesday 14 October 2026, 9 am local.
const NOW = new Date(2026, 9, 14, 9, 0, 0);
const DAY = 86400000;

function plan(interests, entries = [], now = NOW) {
  return planReminders({ interests, entries, photos: [], nameOf, t, now });
}

describe("planReminders", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterEach(() => { vi.useRealTimers(); });

  it("plans a reminder at 5 pm on each of the next seven days for an every-day hobby", () => {
    const p = plan([{ id: "a", name: "Piano", createdAt: NOW.getTime() }])
      .filter((r) => r.title === "Forest");
    expect(p).toHaveLength(7);
    expect(p[0].at).toEqual(new Date(2026, 9, 14, 17, 0, 0));
    expect(p[0].path).toBe("/interest/a");
  });

  it("only uses the days the hobby was set for", () => {
    // 1 = Monday. The next Monday after Wed 14 Oct is the 19th.
    const p = plan([{ id: "a", name: "Piano", days: [1], createdAt: NOW.getTime() }])
      .filter((r) => r.title === "Forest");
    expect(p.map((r) => r.at.getDate())).toEqual([19]);
  });

  it("leaves out today for a hobby already logged today, but keeps the rest of the week", () => {
    const p = plan(
      [{ id: "a", name: "Piano", createdAt: NOW.getTime() }],
      [{ id: "e", interestId: "a", date: "2026-10-14" }],
    ).filter((r) => r.title === "Forest");
    expect(p).toHaveLength(6);
    expect(p[0].at.getDate()).toBe(15);
  });

  it("skips today once 5 pm has passed", () => {
    const evening = new Date(2026, 9, 14, 18, 0, 0);
    vi.setSystemTime(evening);
    const p = plan([{ id: "a", name: "Piano", createdAt: evening.getTime() }], [], evening)
      .filter((r) => r.title === "Forest");
    expect(p[0].at.getDate()).toBe(15);
  });

  it("groups several hobbies into one reminder that opens Home", () => {
    const p = plan([
      { id: "a", name: "Piano", createdAt: NOW.getTime() },
      { id: "b", name: "Chess", createdAt: NOW.getTime() },
    ]).filter((r) => r.title === "Forest");
    expect(p[0].body).toBe("Today's hobbies: Piano, Chess");
    expect(p[0].path).toBe("/");
  });

  it("warns the day before a tree dies", () => {
    // Last tended 27 days ago: dies in 3 days, so the warning is in 2.
    const planted = NOW.getTime() - 27 * DAY;
    const p = plan([{ id: "a", name: "Piano", days: [6], createdAt: planted }])
      .filter((r) => r.title === "Piano is nearly gone");
    expect(p).toHaveLength(1);
    expect(p[0].at).toEqual(new Date(2026, 9, 16, 17, 0, 0));
    expect(p[0].path).toBe("/interest/a");
  });

  it("numbers reminders from 1 in time order and never passes the iOS limit", () => {
    const many = Array.from({ length: 80 }, (_, i) => ({
      id: "i" + i, name: "H" + i, days: [], createdAt: NOW.getTime() - 25 * DAY,
    }));
    const p = plan(many);
    expect(p.length).toBeLessThanOrEqual(60);
    expect(p.map((r) => r.id)).toEqual(p.map((_, i) => i + 1));
    for (let i = 1; i < p.length; i++) expect(p[i].at >= p[i - 1].at).toBe(true);
  });

  it("plans nothing for an empty garden", () => {
    expect(plan([])).toEqual([]);
  });
});
