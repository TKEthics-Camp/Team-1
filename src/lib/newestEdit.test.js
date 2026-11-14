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
  it("keeps bytes that never uploaded when the other device edits the row", () => {
    // Local has no path at all, the server's row says null: same file, none
    // yet. These bytes are the only copy, and the upload is still owed.
    expect(mergePulled("photos", { id: "p", blob }, { id: "p", caption: "new", storagePath: null }).blob).toBe(blob);
    expect(mergePulled("entries", { id: "e", audio: blob }, { id: "e", text: "new", audioPath: null }).audio).toBe(blob);
  });
  it("drops a voice note removed on the other device", () => {
    expect(mergePulled("entries", { audioPath: "u/e", audio: blob }, { audioPath: null }).audio).toBeUndefined();
  });
  it("drops a voice note re-recorded on the other device, whose path stays the same", () => {
    const local = { audioPath: "u/e", audioMs: 4000, audio: blob };
    expect(mergePulled("entries", local, { audioPath: "u/e", audioMs: 9000 }).audio).toBeUndefined();
    expect(mergePulled("entries", local, { audioPath: "u/e", audioMs: 4000 }).audio).toBe(blob);
  });
  it("carries a deletion from the other device", () => {
    expect(mergePulled("entries", { id: "e", text: "a" }, { id: "e", text: "a", deletedAt: 5 }).deletedAt).toBe(5);
  });
});

describe("touched", () => {
  it("stamps now, and never goes backwards", async () => {
    const { touched } = await import("./newestEdit");
    expect(touched({ id: "a" }, 500).updatedAt).toBe(500);
    expect(touched({ id: "a", updatedAt: 900 }, 500).updatedAt).toBe(901);
  });
});
