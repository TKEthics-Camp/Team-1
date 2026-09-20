import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { dateKey, today, keyToDate, keyDays, fmtDate } from "./dates";

// These run under a fixed TZ=Asia/Singapore (see the npm test script) —
// UTC+8, no DST. A fixed non-zero offset is the whole point: the bug this
// file guards against is invisible in UTC, which is exactly how it survives
// a developer's machine and breaks for users.
describe("dateKey", () => {
  it("uses the local date, not the UTC one", () => {
    // 07:00 in Singapore is still the previous day in UTC. toISOString()
    // would report 2026-03-09 here and silently move someone's streak a
    // day, which is why dateKey builds the string from local parts.
    const morning = new Date(2026, 2, 10, 7, 0, 0);
    expect(dateKey(morning)).toBe("2026-03-10");
    expect(morning.toISOString().slice(0, 10)).toBe("2026-03-09");
  });

  it("holds at both ends of the local day", () => {
    expect(dateKey(new Date(2026, 2, 10, 0, 0, 0))).toBe("2026-03-10");
    expect(dateKey(new Date(2026, 2, 10, 23, 59, 59))).toBe("2026-03-10");
  });

  it("zero-pads months and days", () => {
    expect(dateKey(new Date(2026, 0, 1))).toBe("2026-01-01");
    expect(dateKey(new Date(2026, 8, 9))).toBe("2026-09-09");
  });

  it("defaults to now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 10, 12));
    expect(dateKey()).toBe("2026-03-10");
    expect(today()).toBe("2026-03-10");
    vi.useRealTimers();
  });
});

describe("keyToDate / keyDays", () => {
  it("round-trips a key through a local Date", () => {
    expect(dateKey(keyToDate("2026-03-10"))).toBe("2026-03-10");
  });

  it("measures whole days between keys", () => {
    expect(keyDays("2026-03-10") - keyDays("2026-03-03")).toBe(7);
    expect(keyDays("2026-03-01") - keyDays("2026-02-28")).toBe(1);
  });

  it("counts across a leap day", () => {
    // 2028 is a leap year: Feb has 29 days
    expect(keyDays("2028-03-01") - keyDays("2028-02-28")).toBe(2);
  });

  it("counts across a year boundary", () => {
    expect(keyDays("2027-01-01") - keyDays("2026-12-31")).toBe(1);
  });
});

describe("fmtDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 10, 12));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("names today and yesterday in both languages", () => {
    expect(fmtDate("2026-03-10", "en")).toBe("Today");
    expect(fmtDate("2026-03-09", "en")).toBe("Yesterday");
    expect(fmtDate("2026-03-10", "zh")).toBe("今天");
    expect(fmtDate("2026-03-09", "zh")).toBe("昨天");
  });

  it("falls back to a written date further back", () => {
    expect(fmtDate("2026-03-01", "zh")).toBe("3月1日");
    expect(fmtDate("2026-03-01", "en")).toMatch(/1 Mar/);
  });
});
