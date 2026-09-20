import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  treeStage, actsToNextStage, treeHealth, daysIdle, daysUntilDeath,
  isDyingSoon, daysPlanted, growthTimeline, speciesOf, leafColorOf, SPECIES,
} from "./tree";
import { dateKey } from "./dates";

const NOW = new Date(2026, 2, 10, 12, 0, 0);

function ago(n) {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d;
}
function agoKey(n) {
  return dateKey(ago(n));
}
// n entries for one hobby, all dated today unless a date is given.
function logs(n, id = "x", date = null) {
  return Array.from({ length: n }, (_, i) => ({
    id: "e" + i, interestId: id, date: date || agoKey(0), minutes: 30, createdAt: i,
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

const tree = { id: "x", createdAt: ago(0).getTime() };

describe("treeStage", () => {
  // Thresholds are cumulative: 5 to sprout, then 6, 7, 8 more.
  it.each([
    [0, 0], [4, 0], [5, 1], [10, 1], [11, 2],
    [17, 2], [18, 3], [25, 3], [26, 4], [99, 4],
  ])("%i logs is stage %i", (acts, stage) => {
    expect(treeStage(tree, logs(acts), [])).toBe(stage);
  });

  it("counts photos toward growth the same as entries", () => {
    const photos = Array.from({ length: 5 }, (_, i) => ({
      id: "p" + i, interestId: "x", createdAt: ago(0).getTime(),
    }));
    expect(treeStage(tree, [], photos)).toBe(1);
  });

  it("does not count another hobby's logs", () => {
    expect(treeStage(tree, logs(10, "somethingelse"), [])).toBe(0);
  });
});

describe("actsToNextStage", () => {
  it("counts down to the next threshold", () => {
    expect(actsToNextStage(tree, logs(0), [])).toBe(5);
    expect(actsToNextStage(tree, logs(4), [])).toBe(1);
    expect(actsToNextStage(tree, logs(5), [])).toBe(6);
  });

  it("is zero once fully grown, with nothing left to count toward", () => {
    expect(actsToNextStage(tree, logs(26), [])).toBe(0);
    expect(actsToNextStage(tree, logs(40), [])).toBe(0);
  });
});

describe("treeHealth", () => {
  // Boundaries are where this silently goes wrong, so each is pinned from
  // both sides rather than sampled in the middle.
  it.each([
    [0, "healthy"], [6, "healthy"], [7, "wilting"], [13, "wilting"],
    [14, "bare"], [29, "bare"], [30, "dead"], [400, "dead"],
  ])("%i days idle reads as %s", (days, health) => {
    expect(treeHealth(tree, logs(1, "x", agoKey(days)), [])).toBe(health);
  });

  it("counts a brand-new tree with no logs from the day it was planted", () => {
    const fresh = { id: "x", createdAt: ago(3).getTime() };
    expect(daysIdle(fresh, [], [])).toBe(3);
    expect(treeHealth(fresh, [], [])).toBe("healthy");
  });

  it("treats a revive as tending it, so a revived tree isn't instantly dead again", () => {
    const revived = { id: "x", createdAt: ago(90).getTime(), revivedAt: ago(1).getTime() };
    expect(treeHealth(revived, logs(1, "x", agoKey(90)), [])).toBe("healthy");
  });
});

describe("daysUntilDeath / isDyingSoon", () => {
  it("counts down from the death threshold and floors at zero", () => {
    expect(daysUntilDeath(tree, logs(1, "x", agoKey(0)), [])).toBe(30);
    expect(daysUntilDeath(tree, logs(1, "x", agoKey(28)), [])).toBe(2);
    expect(daysUntilDeath(tree, logs(1, "x", agoKey(45)), [])).toBe(0);
  });

  it("warns only inside the window, not from day one and not after death", () => {
    expect(isDyingSoon(tree, logs(1, "x", agoKey(0)), [])).toBe(false);
    expect(isDyingSoon(tree, logs(1, "x", agoKey(24)), [])).toBe(false); // 6 left
    expect(isDyingSoon(tree, logs(1, "x", agoKey(25)), [])).toBe(true);  // 5 left
    expect(isDyingSoon(tree, logs(1, "x", agoKey(29)), [])).toBe(true);  // 1 left
    expect(isDyingSoon(tree, logs(1, "x", agoKey(30)), [])).toBe(false); // dead
  });
});

describe("daysPlanted", () => {
  it("keeps counting regardless of how recently the tree was tended", () => {
    expect(daysPlanted({ createdAt: ago(12).getTime() })).toBe(12);
  });

  it("never goes negative for a tree created later than now", () => {
    expect(daysPlanted({ createdAt: new Date(NOW).getTime() + 86400000 })).toBe(0);
  });
});

describe("growthTimeline", () => {
  it("starts at the planting day even with nothing logged", () => {
    expect(growthTimeline(tree, [], [])).toEqual([{ stage: 0, date: agoKey(0) }]);
  });

  it("adds one frame per stage actually reached", () => {
    const frames = growthTimeline(tree, logs(11), []);
    expect(frames.map((f) => f.stage)).toEqual([0, 1, 2]);
  });

  it("never exceeds five frames however many logs there are", () => {
    expect(growthTimeline(tree, logs(500), []).length).toBe(5);
  });
});

describe("speciesOf / leafColorOf", () => {
  it("is stable for the same id", () => {
    expect(speciesOf({ id: "abc" })).toBe(speciesOf({ id: "abc" }));
    expect(leafColorOf({ id: "abc" })).toBe(leafColorOf({ id: "abc" }));
  });

  it("always lands on a real species, even with no id at all", () => {
    expect(SPECIES).toContain(speciesOf({}));
    expect(SPECIES).toContain(speciesOf(null));
  });
});
