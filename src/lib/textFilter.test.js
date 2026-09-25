import { describe, it, expect } from "vitest";
import { containsProfanity } from "./textFilter";
import { isBlockedHobby } from "./hobbyFilter";

describe("containsProfanity", () => {
  it("catches plain and censored spellings", () => {
    expect(containsProfanity("this is shit")).toBe(true);
    expect(containsProfanity("what the f*ck")).toBe(true);
    expect(containsProfanity("傻逼")).toBe(true);
  });

  it("catches a slur glued to other text", () => {
    expect(containsProfanity("fuckthis")).toBe(true);
  });

  it("does not fire on ordinary words that contain short terms", () => {
    // The whole-word-only list exists for exactly these: "class" contains
    // "ass", "peacock" contains "cock", "predict" contains "dick".
    for (const clean of ["my class today", "I saw a peacock", "hard to predict", "a bass guitar"]) {
      expect(containsProfanity(clean)).toBe(false);
    }
  });

  it("is empty-safe", () => {
    expect(containsProfanity("")).toBe(false);
    expect(containsProfanity(null)).toBe(false);
    expect(containsProfanity(undefined)).toBe(false);
  });

  it("reads a whole paragraph, not just the first words", () => {
    // Journal entries are paragraphs. A filter that only looked at the
    // opening would miss everything that matters.
    const entry = "Today I practised for an hour and it went well. " +
      "Then my brother called me a bitch and I got upset.";
    expect(containsProfanity(entry)).toBe(true);
  });
});

describe("isBlockedHobby still works after the split", () => {
  it("rejects screen-time hobbies", () => {
    expect(isBlockedHobby("video games")).toBe(true);
    expect(isBlockedHobby("原神")).toBe(true);
    expect(isBlockedHobby("tiktok")).toBe(true);
  });

  it("rejects profanity in a hobby name", () => {
    expect(isBlockedHobby("shit")).toBe(true);
  });

  it("allows real hobbies", () => {
    for (const ok of ["painting", "书法", "running", "playing guitar"]) {
      expect(isBlockedHobby(ok)).toBe(false);
    }
  });

  it("does not apply the screen-time list to free text", () => {
    // "I played a video game today" is a fine thing to write in a diary.
    // It is only a bad answer to "what hobby are you growing?".
    expect(containsProfanity("I played a video game today")).toBe(false);
    expect(isBlockedHobby("video game")).toBe(true);
  });
});
