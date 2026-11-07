import { describe, it, expect } from "vitest";
import { recommendations, ideaOf, ideaCat } from "./explore";

const nameOf = (it) => it.name;

describe("recommendations", () => {
  it("mixes categories instead of filling up on one", () => {
    const { list } = recommendations([{ name: "Basketball" }], nameOf, "en");
    const cats = list.map((idea) => idea[3]);
    expect(cats.filter((c) => c === "sport").length).toBeLessThanOrEqual(2);
    expect(new Set(cats).size).toBeGreaterThan(1);
  });

  it("still puts the closest category first", () => {
    const { list } = recommendations([{ name: "Piano" }], nameOf, "en");
    expect(list[0][3]).toBe("music");
  });

  it("never suggests a hobby already planted", () => {
    const { list } = recommendations([{ name: "Basketball" }, { name: "Football" }], nameOf, "en");
    expect(list.map((idea) => idea[0])).not.toContain("Football");
  });

  it("has nothing to say about hobbies it doesn't know", () => {
    expect(recommendations([{ name: "Knitting" }], nameOf, "en").list).toEqual([]);
  });
});

describe("ideaOf", () => {
  it("matches English case-insensitively and Chinese exactly", () => {
    expect(ideaOf("basketball")[0]).toBe("Basketball");
    expect(ideaOf("篮球")[0]).toBe("Basketball");
    expect(ideaOf("Knitting")).toBeNull();
    expect(ideaCat("吉他")).toBe("music");
  });
});
