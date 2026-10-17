import { describe, it, expect } from "vitest";
import { newerSide, mergePulled } from "./newestEdit";

describe("newerSide", () => {
  it("pulls when the server's copy was edited later", () => {
    expect(newerSide({ updatedAt: 100 }, { updatedAt: 200 })).toBe("pull");
  });
  it("pushes when this device's copy was edited later", () => {
    expect(newerSide({ updatedAt: 300 }, { updatedAt: 200 })).toBe("push");
  });
  it("does nothing when both carry the same stamp", () => {
    expect(newerSide({ updatedAt: 200 }, { updatedAt: 200 })).toBe("same");
  });
  it("falls back to when the record was made, for records never edited", () => {
    expect(newerSide({ createdAt: 50 }, { createdAt: 50 })).toBe("same");
    expect(newerSide({ createdAt: 50 }, { createdAt: 50, updatedAt: 90 })).toBe("pull");
  });
});

describe("mergePulled", () => {
  const blob = new Blob(["x"]);
  it("takes the server's fields but keeps this device's photo bytes for the same file", () => {
    const m = mergePulled("photos", { id: "p", caption: "old", storagePath: "u/p.jpg", blob }, { id: "p", caption: "new", storagePath: "u/p.jpg" });
    expect(m.caption).toBe("new");
    expect(m.blob).toBe(blob);
  });
  it("drops the bytes when the newer copy points at a different file", () => {
    const m = mergePulled("photos", { id: "p", storagePath: "u/a.jpg", blob }, { id: "p", storagePath: "u/b.jpg" });
    expect(m.blob).toBeUndefined();
  });
  it("keeps a voice note's bytes only while the recording is the same", () => {
    expect(mergePulled("entries", { audioPath: "u/e", audio: blob }, { audioPath: "u/e", text: "hi" }).audio).toBe(blob);
    expect(mergePulled("entries", { audioPath: "u/e", audio: blob }, { audioPath: "u/e2" }).audio).toBeUndefined();
  });
  it("carries a deletion from the other device", () => {
    expect(mergePulled("entries", { id: "e", text: "a" }, { id: "e", text: "a", deletedAt: 5 }).deletedAt).toBe(5);
  });
});
