import { describe, it, expect } from "vitest";
import { journalText } from "./exportData";

const profile = { name: "Lin" };
const interests = [
  { id: "i1", name: "Calligraphy", nameZh: "书法" },
  { id: "i2", name: "Running", nameZh: "跑步" },
];
const entries = [
  { id: "e2", interestId: "i1", date: "2026-09-02", text: "Second stroke practice", minutes: 20 },
  { id: "e1", interestId: "i1", date: "2026-09-01", text: "First day" },
  { id: "e3", interestId: "i1", date: "2026-09-03", text: "", audioPath: "u/e3.webm" },
];
const photos = [{ id: "p1", interestId: "i1", caption: "My brush" }];

describe("journalText", () => {
  it("groups by hobby and puts entries in date order", () => {
    const txt = journalText({ profile, interests, entries, photos });
    const first = txt.indexOf("First day");
    const second = txt.indexOf("Second stroke practice");
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(first);
    expect(txt).toContain("Calligraphy");
    expect(txt).toContain("2026-09-02 · 20 min");
  });

  it("says so when a hobby has nothing in it, rather than leaving a blank", () => {
    const txt = journalText({ profile, interests, entries, photos });
    expect(txt).toContain("Running");
    expect(txt).toContain("(no journal entries yet)");
  });

  it("points at exported files by name", () => {
    const txt = journalText({
      profile, interests, entries, photos,
      photoFiles: new Map([["p1", "photos/p1.jpg"]]),
      audioFiles: new Map([["e3", "voice-notes/e3.webm"]]),
    });
    expect(txt).toContain("photos/p1.jpg — My brush");
    expect(txt).toContain("[voice note] voice-notes/e3.webm");
  });

  it("marks a photo that could not be fetched instead of dropping it", () => {
    const txt = journalText({ profile, interests, entries, photos });
    expect(txt).toContain("(could not be downloaded) — My brush");
  });

  it("writes Chinese hobby names and labels in Chinese", () => {
    const txt = journalText({ profile, interests, entries, photos, lang: "zh" });
    expect(txt).toContain("书法");
    expect(txt).toContain("Lin 的 Forest 日记");
    expect(txt).toContain("20 分钟");
  });
});

import { buildExport } from "./exportData";

describe("buildExport", () => {
  it("produces a zip with the journal, the data file, and every local photo and recording", async () => {
    const { default: JSZip } = await import("jszip");
    const photo = new Blob(["fake-jpeg-bytes"], { type: "image/jpeg" });
    const voice = new Blob(["fake-audio"], { type: "audio/mp4" });

    const { blob, missing } = await buildExport({
      profile: { name: "Lin", theme: "forest" },
      interests,
      entries: [
        { id: "e1", interestId: "i1", date: "2026-09-01", text: "First day" },
        { id: "e9", interestId: "i1", date: "2026-09-04", text: "", audio: voice },
      ],
      photos: [{ id: "p1", interestId: "i1", caption: "My brush", blob: photo }],
    });

    expect(missing).toEqual([]);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir).sort();
    expect(names).toEqual(["data.json", "journal.txt", "photos/p1.jpg", "voice-notes/e9.m4a"]);

    // The binary files are the real bytes, not a reference to them.
    expect(await zip.file("photos/p1.jpg").async("string")).toBe("fake-jpeg-bytes");

    // data.json carries everything except the raw blobs, which are files.
    const data = JSON.parse(await zip.file("data.json").async("string"));
    expect(data.profile.name).toBe("Lin");
    expect(data.photos[0].file).toBe("photos/p1.jpg");
    expect(data.photos[0].blob).toBeUndefined();
    expect(data.entries.find((e) => e.id === "e9").voiceNoteFile).toBe("voice-notes/e9.m4a");
  });
});
