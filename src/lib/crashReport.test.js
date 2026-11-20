// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./supabase", () => ({ supabase: null }));
const { reportCrash, screenOf, describeError, _resetSent } = await import("./crashReport");

function client({ signedIn = true, fail = false } = {}) {
  return {
    auth: { getSession: vi.fn(async () => ({ data: { session: signedIn ? { user: { id: "u1" } } : null } })) },
    rpc: vi.fn(async () => ({ error: fail ? { message: "nope" } : null })),
  };
}

beforeEach(() => _resetSent());

describe("screenOf", () => {
  it("blanks out record ids", () => {
    expect(screenOf("/interest/3f2a9c1e-1b2c-4d5e-8f90-1234567890ab")).toBe("/interest/:id");
    expect(screenOf("/user/3f2a9c1e-1b2c-4d5e-8f90-1234567890ab/interest/aZ09_bY18-cX27dW36")).toBe("/user/:id/interest/:id");
    expect(screenOf("/journal")).toBe("/journal");
  });
});

describe("describeError", () => {
  it("handles errors, strings and anything else", () => {
    expect(describeError(new TypeError("x is null")).message).toBe("TypeError: x is null");
    expect(describeError("plain")).toEqual({ message: "plain", stack: null });
    expect(describeError({ code: 1 }).message).toBe('{"code":1}');
  });
});

describe("reportCrash", () => {
  it("sends one report with the screen, version and platform", async () => {
    const c = client();
    expect(await reportCrash(new Error("boom"), { componentStack: "at Home" }, c)).toBe(true);
    const [name, args] = c.rpc.mock.calls[0];
    expect(name).toBe("report_crash");
    expect(args).toMatchObject({ p_message: "Error: boom", p_platform: "web" });
    expect(args.p_stack).toContain("at Home");
  });

  it("sends each crash once, and at most five a session", async () => {
    const c = client();
    await reportCrash(new Error("same"), {}, c);
    await reportCrash(new Error("same"), {}, c);
    for (let i = 0; i < 10; i++) await reportCrash(new Error("e" + i), {}, c);
    expect(c.rpc).toHaveBeenCalledTimes(5);
  });

  it("sends nothing signed out, and never throws", async () => {
    const out = client({ signedIn: false });
    expect(await reportCrash(new Error("a"), {}, out)).toBe(false);
    expect(out.rpc).not.toHaveBeenCalled();
    const broken = { auth: { getSession: () => { throw new Error("offline"); } }, rpc: vi.fn() };
    expect(await reportCrash(new Error("b"), {}, /** @type {any} */ (broken))).toBe(false);
  });
});
