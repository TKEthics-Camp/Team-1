import { describe, it, expect } from "vitest";
import { generateRecoveryCode, canonicalRecoveryCode } from "./recoveryCode";

describe("generateRecoveryCode", () => {
  it("produces three dash-separated groups of four", () => {
    expect(generateRecoveryCode()).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it("never uses characters that get misread in handwriting", () => {
    // 0/O, 1/I/L and 5/S are the pairs a child copying this onto paper
    // confuses, so the alphabet has to exclude them permanently.
    const codes = Array.from({ length: 200 }, () => generateRecoveryCode()).join("");
    expect(codes).not.toMatch(/[0O1IL5S]/);
  });

  it("does not repeat itself", () => {
    const seen = new Set(Array.from({ length: 200 }, () => generateRecoveryCode()));
    expect(seen.size).toBe(200);
  });
});

describe("canonicalRecoveryCode", () => {
  // The bug this guards: issuing hashed the displayed string with its
  // dashes, redeeming stripped only whitespace. Every transcription below
  // is one a child could plausibly hand back, and all of them have to mean
  // the same code.
  it("treats every plausible transcription of one code as the same code", () => {
    const canonical = canonicalRecoveryCode("ABCD-EFGH-JKMN");
    expect(canonical).toBe("ABCDEFGHJKMN");

    const transcriptions = [
      "ABCD-EFGH-JKMN",
      "ABCDEFGHJKMN",
      "abcd-efgh-jkmn",
      "ABCD EFGH JKMN",
      "  ABCD-EFGH-JKMN  ",
      "ABCDEFGH-JKMN",
      "AB-CD-EF-GH-JK-MN",
      "abcd efgh\njkmn",
    ];
    for (const typed of transcriptions) {
      expect(canonicalRecoveryCode(typed)).toBe(canonical);
    }
  });

  it("round-trips whatever generateRecoveryCode produced", () => {
    for (let i = 0; i < 50; i += 1) {
      const shown = generateRecoveryCode();
      expect(canonicalRecoveryCode(shown)).toHaveLength(12);
      expect(canonicalRecoveryCode(shown.replace(/-/g, " "))).toBe(canonicalRecoveryCode(shown));
    }
  });

  it("is at least the 12 characters the server demands", () => {
    // set_recovery_code rejects anything shorter, so a canonical form that
    // fell below 12 would fail at the database with a confusing message.
    expect(canonicalRecoveryCode(generateRecoveryCode()).length).toBeGreaterThanOrEqual(12);
  });

  it("does not throw on empty or missing input", () => {
    expect(canonicalRecoveryCode("")).toBe("");
    expect(canonicalRecoveryCode(null)).toBe("");
    expect(canonicalRecoveryCode(undefined)).toBe("");
  });

  it("keeps two different codes different", () => {
    expect(canonicalRecoveryCode("ABCD-EFGH-JKMN")).not.toBe(canonicalRecoveryCode("ABCD-EFGH-JKMP"));
  });
});
