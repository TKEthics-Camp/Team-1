import { describe, it, expect } from "vitest";
import { usernameToEmail } from "./syntheticEmail";

// Individuals sign up with a username and no email; Supabase Auth still
// needs an address, so one is derived. Login re-derives it from the same
// username rather than looking anything up — which makes "the same username
// always produces the same address" a correctness requirement, not a detail.
describe("usernameToEmail", () => {
  it("is stable for the same username", () => {
    expect(usernameToEmail("ellie")).toBe(usernameToEmail("ellie"));
  });

  it("ignores case and surrounding whitespace, so login isn't fussy", () => {
    const base = usernameToEmail("ellie");
    expect(usernameToEmail("Ellie")).toBe(base);
    expect(usernameToEmail("  ELLIE  ")).toBe(base);
  });

  it("keeps the characters an address can carry", () => {
    expect(usernameToEmail("ellie.b_9-x")).toBe("ellie.b_9-x@users.forestapp.invalid");
  });

  it("collapses anything else into a single dash", () => {
    expect(usernameToEmail("ellie   b")).toBe("ellie-b@users.forestapp.invalid");
    expect(usernameToEmail("艾莉")).toBe("user@users.forestapp.invalid");
  });

  it("trims leading and trailing punctuation", () => {
    expect(usernameToEmail("..ellie..")).toBe("ellie@users.forestapp.invalid");
    expect(usernameToEmail("--ellie--")).toBe("ellie@users.forestapp.invalid");
  });

  it("never produces a bare @domain for empty or unusable input", () => {
    expect(usernameToEmail("")).toBe("user@users.forestapp.invalid");
    expect(usernameToEmail(null)).toBe("user@users.forestapp.invalid");
    expect(usernameToEmail("...")).toBe("user@users.forestapp.invalid");
  });

  it("uses a reserved TLD, so nothing here can ever reach a real inbox", () => {
    expect(usernameToEmail("ellie").endsWith(".invalid")).toBe(true);
  });

  // Documented and deliberate: display_name's unique index is the real
  // uniqueness gate, and a collision here surfaces as Supabase's own
  // "already registered" error. Pinned so it stays a known trade-off rather
  // than becoming a surprise.
  it("collides for usernames differing only in stripped characters", () => {
    expect(usernameToEmail("el lie")).toBe(usernameToEmail("el-lie"));
  });
});
