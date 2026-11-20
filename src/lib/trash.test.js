import { describe, it, expect } from "vitest";
import { sweepTrash, trashList, trashedWith, untrash } from "./trash";
import { touched } from "./newestEdit";

describe("sweepTrash", () => {
  it("keeps live rows, hides trashed ones, expires old ones", () => {
    const rows = [{ id: "live" }, { id: "recent", deletedAt: 50 }, { id: "old", deletedAt: 5 }];
    const { keep, expired } = sweepTrash(rows, 10);
    expect(keep.map((r) => r.id)).toEqual(["live"]);
    expect(expired.map((r) => r.id)).toEqual(["old"]);
  });
});

describe("trashList", () => {
  it("lists a deleted tree once, without its children, newest first", () => {
    const ints = [{ id: "t1", deletedAt: 100 }, { id: "t2" }];
    const ph = [{ id: "p1", interestId: "t1", deletedAt: 100 }, { id: "p2", interestId: "t2", deletedAt: 200 }];
    const en = [{ id: "e1", interestId: "t2", deletedAt: 150 }, { id: "e2", interestId: "t2", deletedAt: 1 }];
    const out = trashList(ints, ph, en, 10);
    expect(out.map((x) => [x.kind, x.rec.id])).toEqual([["photo", "p2"], ["entry", "e1"], ["interest", "t1"]]);
  });
});

describe("trashedWith", () => {
  it("returns only children deleted together with the tree", () => {
    const tree = { id: "t1", deletedAt: 100 };
    const rows = [
      { id: "a", interestId: "t1", deletedAt: 100 },
      { id: "b", interestId: "t1", deletedAt: 40 },
      { id: "c", interestId: "t2", deletedAt: 100 },
    ];
    expect(trashedWith(rows, tree).map((r) => r.id)).toEqual(["a"]);
  });
});

describe("untrash", () => {
  it("drops deletedAt and stamps a newer edit", () => {
    const back = untrash({ id: "a", deletedAt: 100, updatedAt: 100 }, (r) => touched(r, 50));
    expect(back).toEqual({ id: "a", updatedAt: 101 });
  });
});
