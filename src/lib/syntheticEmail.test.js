import { describe, it, expect } from "vitest";
import { usernameToEmail, legacyUsernameToEmail, isDerivedEmail } from "./syntheticEmail";

const PINNED_XIAOMING = "u-13bglpptqun@users.forestapp.invalid";

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
  });

  // The address is derived again at every login, so it can never change for
  // a name that already has an account. Pinned to literal values on purpose.
  it("gives non-ASCII usernames an address of their own", () => {
    expect(usernameToEmail("小明")).not.toBe(usernameToEmail("小红"));
    expect(usernameToEmail("小明a")).not.toBe(usernameToEmail("小红a"));
    expect(usernameToEmail("小明")).toBe(usernameToEmail("  小明 "));
    expect(usernameToEmail("小明")).toMatch(/^u-[a-z0-9]+@users\.forestapp\.invalid$/);
    expect(usernameToEmail("小明a")).toMatch(/^a-[a-z0-9]+@users\.forestapp\.invalid$/);
    expect(usernameToEmail("小明")).toBe(PINNED_XIAOMING);
  });

  it("keeps a long Chinese username inside an address's 64-character limit", () => {
    const local = usernameToEmail("汉".repeat(20)).split("@")[0];
    expect(local.length).toBeLessThanOrEqual(64);
  });

  it("leaves ASCII usernames on the address they always had", () => {
    expect(usernameToEmail("ellie")).toBe(legacyUsernameToEmail("ellie"));
    expect(usernameToEmail("el lie")).toBe(legacyUsernameToEmail("el lie"));
  });

  it("can still name the address older non-ASCII accounts were created under", () => {
    expect(legacyUsernameToEmail("艾莉")).toBe("user@users.forestapp.invalid");
    expect(legacyUsernameToEmail("小明a")).toBe("a@users.forestapp.invalid");
  });

  it("tells a derived address from a real one", () => {
    expect(isDerivedEmail(usernameToEmail("ellie"))).toBe(true);
    expect(isDerivedEmail(usernameToEmail("小明"))).toBe(true);
    expect(isDerivedEmail("teacher@school.edu")).toBe(false);
    expect(isDerivedEmail(null)).toBe(false);
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
