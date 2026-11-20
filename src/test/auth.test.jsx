// @vitest-environment jsdom
// Signing up and signing in, clicked through AuthFlow. The server side
// (Supabase auth, the username reservation, the age gate) is faked; what's
// checked is what the screen asks for, what it refuses, and what it sends.
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";

const h = vi.hoisted(() => ({
  auth: null,
  reserveError: null,
  gate: { ok: true },
  updates: [],
  signOut: null,
  consent: { state: "age_required" },
  remount: () => {},
}));
vi.mock("../store/AuthContext", () => ({ useAuth: () => h.auth }));
// Signed out there's no profile yet; the language switch only needs this.
vi.mock("../store/StoreContext", () => ({ useStore: () => ({ profile: null, setLangOnProfile: () => {} }) }));
vi.mock("../lib/supabase", () => ({
  supabase: {
    from: () => ({
      update: (patch) => ({
        eq: async (_col, id) => { h.updates.push({ patch, id }); return { error: h.reserveError }; },
      }),
    }),
    auth: { signOut: (...a) => h.signOut(...a) },
  },
}));
vi.mock("../lib/remote", () => ({
  applyAgeGate: vi.fn(async () => h.gate),
  myConsentStatus: async () => h.consent,
}));

const { STR } = await import("../i18n/strings");
const { I18nProvider } = await import("../i18n/I18nContext");
const { applyAgeGate } = await import("../lib/remote");
const { usernameToEmail, legacyUsernameToEmail } = await import("../lib/syntheticEmail");
const { stubBrowser } = await import("./fakeServer");
const { takeAgeGateError } = await import("../lib/useConsentStatus");
const AuthFlow = (await import("../components/auth/AuthFlow")).default;

const en = (key) => STR[key][0];
const click = (name) => fireEvent.click(screen.getByRole("button", { name }));
const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

// Signing out unmounts AuthFlow and mounts a fresh one, the way App does
// when the session goes away.
function Host() {
  const [n, setN] = useState(0);
  h.remount = () => setN((x) => x + 1);
  return <AuthFlow key={n} />;
}
function show() {
  render(<I18nProvider><Host /></I18nProvider>);
}
async function toCredentials() {
  click(en("sfStart"));
  click(en("sfJustMe"));
  click(en("sfContinue"));
  fireEvent.change(screen.getByLabelText(en("agYear")), { target: { value: "2013" } });
  fireEvent.change(screen.getByLabelText(en("agMonth")), { target: { value: "5" } });
  fireEvent.change(screen.getByLabelText(en("agDay")), { target: { value: "20" } });
  click(en("agContinue"));
  await screen.findByLabelText(en("sfUsername"));
}
function fillIn({ username = "mei", password = "secret1", confirm = "secret1", agree = true } = {}) {
  type(en("sfUsername"), username);
  type(en("authPassword"), password);
  type(en("authConfirmPassword"), confirm);
  if (agree) fireEvent.click(screen.getByRole("checkbox"));
}

beforeAll(stubBrowser);
beforeEach(() => {
  h.auth = {
    signUp: vi.fn(async () => ({ ok: true, userId: "u1" })),
    signIn: vi.fn(async () => ({ ok: true })),
    authError: null,
    clearAuthError: vi.fn(),
  };
  h.reserveError = null;
  h.gate = { ok: true };
  h.updates = [];
  h.signOut = vi.fn(async () => { act(() => h.remount()); });
  h.consent = { state: "age_required" };
  takeAgeGateError();
  vi.mocked(applyAgeGate).mockClear();
});
afterEach(cleanup);

describe("signing up as a student", () => {
  it("creates the account under the username's address, reserves the name, and checks age", async () => {
    show();
    await toCredentials();
    fillIn();
    click(en("sfContinue"));
    await waitFor(() => expect(applyAgeGate).toHaveBeenCalledWith("2013-05-20", null));
    expect(h.auth.signUp).toHaveBeenCalledWith(usernameToEmail("mei"), "secret1", { username: "mei", accountType: "individual" });
    expect(h.updates).toEqual([{ patch: { display_name: "mei" }, id: "u1" }]);
    expect(h.signOut).not.toHaveBeenCalled();
  });

  it("can't continue until the terms are agreed to", async () => {
    show();
    await toCredentials();
    fillIn({ agree: false });
    expect(screen.getByRole("button", { name: en("sfContinue") }).hasAttribute("disabled")).toBe(true);
  });

  it("says so when the passwords don't match, and sends nothing", async () => {
    show();
    await toCredentials();
    fillIn({ confirm: "different" });
    click(en("sfContinue"));
    expect(await screen.findByText(en("authPasswordMismatch"))).toBeTruthy();
    expect(h.auth.signUp).not.toHaveBeenCalled();
  });

  it("signs back out when the username is taken, and comes back to the form saying so", async () => {
    h.reserveError = { code: "23505" };
    show();
    await toCredentials();
    fillIn({ username: "mei" });
    click(en("sfContinue"));
    await waitFor(() => expect(h.signOut).toHaveBeenCalled());
    // Not the welcome screen: the same form, as it was left, with the reason.
    expect(await screen.findByText(en("usernameTaken"))).toBeTruthy();
    expect(screen.getByLabelText(en("sfUsername")).value).toBe("mei");
    expect(screen.getByLabelText(en("authPassword")).value).toBe("");
    expect(screen.queryByRole("button", { name: en("sfStart") })).toBeNull();
    expect(applyAgeGate).not.toHaveBeenCalled();
  });

  it("stays signed in when the age check fails, for the birthday screen to ask again", async () => {
    h.gate = { ok: false, message: "birthdate is not a real date" };
    show();
    await toCredentials();
    fillIn();
    click(en("sfContinue"));
    await waitFor(() => expect(applyAgeGate).toHaveBeenCalled());
    await waitFor(() => expect(takeAgeGateError()).toBe("birthdate is not a real date"));
    expect(h.signOut).not.toHaveBeenCalled();
  });

  it("signs out when the age check fails on a server that left the account unlocked", async () => {
    h.gate = { ok: false, message: "function apply_age_gate does not exist" };
    h.consent = { state: "not_required" };
    show();
    await toCredentials();
    fillIn();
    click(en("sfContinue"));
    await waitFor(() => expect(h.signOut).toHaveBeenCalled());
    expect(await screen.findByText("function apply_age_gate does not exist")).toBeTruthy();
  });

  it("says to confirm the email when the server holds back the session", async () => {
    h.auth.signUp = vi.fn(async () => ({ ok: true, needsConfirmation: true, userId: "u1" }));
    show();
    await toCredentials();
    fillIn();
    click(en("sfContinue"));
    expect(await screen.findByText(en("authConfirmSent"))).toBeTruthy();
    expect(h.updates).toEqual([]);
    expect(applyAgeGate).not.toHaveBeenCalled();
  });

  it("won't go past the birthday until it's complete", async () => {
    show();
    click(en("sfStart"));
    click(en("sfJustMe"));
    click(en("sfContinue"));
    fireEvent.change(screen.getByLabelText(en("agYear")), { target: { value: "2013" } });
    expect(screen.getByRole("button", { name: en("agContinue") }).hasAttribute("disabled")).toBe(true);
  });
});

describe("signing in", () => {
  it("turns a username into its address, with the old address as a fallback", async () => {
    show();
    click(en("sfHaveAccount"));
    const fields = document.querySelectorAll("form input");
    fireEvent.change(fields[0], { target: { value: "梅梅" } });
    fireEvent.change(fields[1], { target: { value: "secret1" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(h.auth.signIn).toHaveBeenCalledWith(usernameToEmail("梅梅"), "secret1", legacyUsernameToEmail("梅梅")));
  });

  it("passes an educator's real email straight through", async () => {
    show();
    click(en("sfHaveAccount"));
    const fields = document.querySelectorAll("form input");
    fireEvent.change(fields[0], { target: { value: " teacher@school.edu " } });
    fireEvent.change(fields[1], { target: { value: "secret1" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(h.auth.signIn).toHaveBeenCalledWith("teacher@school.edu", "secret1"));
  });
});
