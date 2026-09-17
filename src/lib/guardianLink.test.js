import { describe, it, expect } from "vitest";
import { guardianTokenFromPath } from "./guardianLink";

const TOKEN = "a".repeat(64);

describe("guardianTokenFromPath", () => {
  it("reads a token at the site root", () => {
    expect(guardianTokenFromPath(`/consent/${TOKEN}`)).toBe(TOKEN);
  });

  it("reads a token under a deployed base path", () => {
    // The app ships to GitHub Pages under a subdirectory, so the guardian's
    // link is never at the origin root in production.
    expect(guardianTokenFromPath(`/Team-1/consent/${TOKEN}`, "/Team-1/")).toBe(TOKEN);
  });

  it("tolerates a trailing slash", () => {
    expect(guardianTokenFromPath(`/consent/${TOKEN}/`)).toBe(TOKEN);
  });

  it("lower-cases the token so the lookup hash matches", () => {
    // The stored form is the SHA-256 of the lower-case token. A phone that
    // capitalises the link would otherwise never resolve.
    expect(guardianTokenFromPath(`/consent/${"A".repeat(64)}`)).toBe("a".repeat(64));
  });

  it("ignores anything that is not a consent link", () => {
    for (const path of ["/", "/user/abc", "/market", "/consent", "/consent/"]) {
      expect(guardianTokenFromPath(path)).toBeNull();
    }
  });

  it("rejects a token of the wrong length or alphabet", () => {
    // Falls through to the normal app rather than rendering a broken
    // consent page: a malformed link is a wrong address, not a failure.
    expect(guardianTokenFromPath("/consent/" + "a".repeat(63))).toBeNull();
    expect(guardianTokenFromPath("/consent/" + "a".repeat(65))).toBeNull();
    expect(guardianTokenFromPath("/consent/" + "z".repeat(64))).toBeNull();
    expect(guardianTokenFromPath(`/consent/${TOKEN}/extra`)).toBeNull();
  });

  it("does not match a consent path nested somewhere else", () => {
    expect(guardianTokenFromPath(`/user/x/consent/${TOKEN}`)).toBeNull();
  });
});
