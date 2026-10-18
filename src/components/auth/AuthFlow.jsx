import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useAuth } from "../../store/AuthContext";
import { supabase } from "../../lib/supabase";
import { applyAgeGate } from "../../lib/remote";
import { holdConsentUntil } from "../../lib/useConsentStatus";
import { usernameToEmail } from "../../lib/syntheticEmail";
import LangToggle from "../shared/LangToggle";
import SfHead from "../onboarding/SfHead";
import RecoverFlow from "./RecoverFlow";
import BirthdateFields, { joinBirthdate } from "./BirthdateFields";
import AccountTypeStep from "../onboarding/AccountTypeStep";
import Mascot from "../shared/Mascot";

// Account type has to be picked before credentials, not after (unlike the
// old email-first flow), because it decides the one real difference: an
// educator gives a real email, an individual never does — see
// lib/syntheticEmail. Username is reserved the moment the account is
// created (same server-side uniqueness check that used to live in
// Onboarding's name step, just moved to where the username is actually
// collected now) rather than at the end of onboarding.
// Survives the remount that signing out causes. Not state, deliberately:
// the component this belongs to is destroyed between setting it and reading
// it back.
let carriedError = null;

export default function AuthFlow() {
  const { t } = useI18n();
  const { signUp, signIn, authError, clearAuthError } = useAuth();
  const [screen, setScreen] = useState("welcome"); // "welcome" | "signup" | "login" | "recover"
  const [signupStep, setSignupStep] = useState("accountType"); // "accountType" | "age" | "credentials"
  const [accountType, setAccountType] = useState(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [localError, setLocalError] = useState(() => {
    const carried = carriedError;
    carriedError = null;
    return carried;
  });
  const [busy, setBusy] = useState(false);

  // Collected before the account exists, so an account is never created
  // without the thing that decides what it is allowed to do. Educators skip
  // this entirely — they are adults by definition of the account type.
  const [bdY, setBdY] = useState("");
  const [bdM, setBdM] = useState("");
  const [bdD, setBdD] = useState("");
  const [classCode, setClassCode] = useState("");
  const birthdate = joinBirthdate(bdY, bdM, bdD);

  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const isOrg = accountType === "org";

  function goWelcome() {
    clearAuthError();
    setLocalError(null);
    setScreen("welcome");
  }

  async function submitSignUp(e) {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) return;
    if (password !== confirmPassword) { setLocalError("authPasswordMismatch"); return; }
    if (isOrg && !email.trim()) return;

    setBusy(true);
    // Registered before the account exists, because the session (and App's
    // question about consent state) arrives the moment signUp resolves —
    // before the age gate below has run. Settled on every path out.
    let settle;
    holdConsentUntil(new Promise((resolve) => { settle = resolve; }));
    try {
      await createAccount(trimmedUsername);
    } finally {
      settle();
      setBusy(false);
    }
  }

  async function createAccount(trimmedUsername) {
    const signupEmail = isOrg ? email.trim() : usernameToEmail(trimmedUsername);
    const result = await signUp(signupEmail, password, { username: trimmedUsername, accountType });
    if (!result.ok) return;

    // The `users` row already exists (the on_auth_user_created trigger made
    // it the moment signUp() above succeeded) — this fills in the display
    // name and account type, and is where a taken username actually surfaces.
    // If it fails, the auth account was still created, so it's rolled back
    // by signing out rather than left as a signed-in account with no valid
    // display name — Onboarding trusts that name is already reserved.
    // account_type isn't set here any more — handle_new_user reads it from
    // the signup metadata, and the column is frozen against client writes
    // (see 20260912000000), since it's what decides who gets the educator
    // dashboard. This is still where a taken username surfaces as a 23505.
    const { error } = await supabase
      .from("users")
      .update({ display_name: trimmedUsername })
      .eq("id", result.userId);
    if (error) {
      console.error("Failed to reserve username:", error);
      await supabase.auth.signOut();
      setLocalError(error.code === "23505" ? "usernameTaken" : "usernameError");
      return;
    }

    // The age gate runs here, once, while we still have the birthdate in
    // hand and before anything can be logged. The server decides which of
    // the three paths this is — an under-14 signup with no class lands in
    // 'pending' and App shows the guardian screen instead of the app.
    //
    // Any failure signs out, including the gate function being missing.
    // That used to be waved through so signup kept working on a project
    // without the migration, which meant a database without the gate made
    // accounts with no age check at all. The account itself survives the
    // sign-out, but it was created in 'age_required' (20261011000000), so
    // signing back in asks for the birthday again rather than letting it in.
    if (!isOrg) {
      const gate = await applyAgeGate(birthdate, classCode.trim() || null);
      if (!gate.ok) {
        await supabase.auth.signOut();
        // Signing out unmounts this component, so an error in local state
        // would be thrown away with it. Module scope survives the remount
        // within the same page load, which is the only lifetime that
        // matters here.
        carriedError = gate.message || "agBadDate";
        return;
      }
    }
  }

  async function submitLogIn(e) {
    e.preventDefault();
    if (!loginId.trim() || !loginPassword) return;
    clearAuthError();
    setBusy(true);
    // A real email (educators) has an "@"; a username (everyone else)
    // never does — re-derive the same placeholder address used at signup.
    const loginEmail = loginId.includes("@") ? loginId.trim() : usernameToEmail(loginId);
    await signIn(loginEmail, loginPassword);
    setBusy(false);
  }

  if (screen === "welcome") {
    return (
      <div className="view sf-view">
        <div className="sf">
          <div className="sf-bar">
            <div className="sf-grow" />
            <LangToggle />
          </div>
          <div className="sf-center">
            <h2 className="sf-wordmark">{t("appName")}</h2>
            <Mascot size={132} className="sf-hero" action="wave" />
            <p className="sf-tagline">{t("sfTagline")}</p>
          </div>
          <div className="sf-foot">
            <button
              type="button"
              className="sf-linkbtn"
              style={{ padding: "0 0 14px" }}
              onClick={() => { setScreen("login"); setSignupStep("accountType"); }}
            >
              {t("sfHaveAccount")}
            </button>
            <button className="sf-btn" onClick={() => { setScreen("signup"); setSignupStep("accountType"); }}>
              {t("sfStart")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Asked before the account exists, so nothing can be created and then
  // retro-fitted with an age. The class code is optional and is what
  // separates the two under-14 paths: with one, the school's consent covers
  // the account; without one, a guardian has to be asked directly.
  if (screen === "signup" && signupStep === "age") {
    const complete = bdY && bdM && bdD;

    return (
      <div className="view sf-view">
        <div className="sf">
          <div className="sf-screen">
            <div className="sf-inner">
              <div className="sf-top">
                <button
                  className="sf-back"
                  type="button"
                  aria-label={t("back")}
                  onClick={() => setSignupStep("accountType")}
                >‹</button>
                <LangToggle />
              </div>

              <SfHead>{t("agTitle")}</SfHead>
              <p className="sf-hint sf-hint-lead">{t("agSub")}</p>

              <BirthdateFields
                bdY={bdY} setBdY={setBdY}
                bdM={bdM} setBdM={setBdM}
                bdD={bdD} setBdD={setBdD}
                classCode={classCode} setClassCode={setClassCode}
              />

              <div className="sf-grow" />
              <div className="sf-foot">
                <button
                  className="sf-btn"
                  type="button"
                  disabled={!complete}
                  onClick={() => setSignupStep("credentials")}
                >
                  {t("agContinue")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "signup" && signupStep === "accountType") {
    return (
      <div className="view sf-view">
        <div className="sf">
          <div className="sf-bar">
            <button className="sf-back" aria-label={t("back")} onClick={goWelcome}>‹</button>
            <div className="sf-grow" />
            <LangToggle />
          </div>
          <AccountTypeStep
            value={accountType}
            setType={setAccountType}
            onNext={() => setSignupStep(accountType === "org" ? "credentials" : "age")}
          />
        </div>
      </div>
    );
  }

  if (screen === "signup") {
    return (
      <div className="view sf-view">
        <form className="sf" onSubmit={submitSignUp}>
          <div className="sf-bar">
            <button
              type="button"
              className="sf-back"
              aria-label={t("back")}
              onClick={() => setSignupStep(accountType === "org" ? "accountType" : "age")}
            >
              ‹
            </button>
            <div className="sf-grow" />
            <LangToggle />
          </div>

          <SfHead>{t("sfSignUpTitle")}</SfHead>

          <div className="sf-stack">
            <div>
              <label className="sf-label" htmlFor="su-username">{t("sfUsername")}</label>
              <input
                id="su-username" className="sf-field" type="text" autoComplete="username"
                disabled={busy}
                value={username}
                onChange={(e) => { setUsername(e.target.value); setLocalError(null); clearAuthError(); }}
              />
            </div>
            <div>
              <label className="sf-label" htmlFor="su-password">{t("authPassword")}</label>
              <input
                id="su-password" className="sf-field" type="password" autoComplete="new-password" minLength={6}
                disabled={busy}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setLocalError(null); }}
              />
            </div>
            <div>
              <label className="sf-label" htmlFor="su-confirm">{t("authConfirmPassword")}</label>
              <input
                id="su-confirm" className="sf-field" type="password" autoComplete="new-password" minLength={6}
                disabled={busy}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setLocalError(null); }}
              />
            </div>
            {isOrg && (
              <div>
                <label className="sf-label" htmlFor="su-email">{t("authEducatorEmail")}</label>
                <input
                  id="su-email" className="sf-field" type="email" autoComplete="email"
                  disabled={busy}
                  placeholder={t("authEmailPh")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}
          </div>

          {(localError || authError) && <p className="sf-err">{localError ? t(localError) : authError}</p>}

          <div className="sf-grow" />
          <div className="sf-foot">
            <button
              className="sf-btn" type="submit"
              disabled={busy || !username.trim() || !password || !confirmPassword || (isOrg && !email.trim())}
            >
              {busy ? t("authWorking") : t("sfContinue")}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (screen === "recover") {
    return (
      <div className="view sf-view">
        <div className="sf">
          <RecoverFlow onBack={() => setScreen("login")} onDone={() => setScreen("welcome")} />
        </div>
      </div>
    );
  }

  // screen === "login"
  return (
    <div className="view sf-view">
      <form className="sf" onSubmit={submitLogIn}>
        <div className="sf-bar">
          <button type="button" className="sf-back" aria-label={t("back")} onClick={goWelcome}>‹</button>
          <div className="sf-grow" />
          <LangToggle />
        </div>

        <SfHead>{t("sfLogIn")}</SfHead>

        <div className="sf-stack">
          <div>
            <label className="sf-label" htmlFor="li-id">{t("sfLoginIdentifier")}</label>
            <input
              id="li-id" className="sf-field" type="text" autoComplete="username"
              disabled={busy}
              value={loginId}
              onChange={(e) => { setLoginId(e.target.value); clearAuthError(); }}
            />
            <p className="sf-hint">{t("sfLoginIdentifierHint")}</p>
          </div>
          <div>
            <label className="sf-label" htmlFor="li-password">{t("authPassword")}</label>
            <input
              id="li-password" className="sf-field" type="password" autoComplete="current-password"
              disabled={busy}
              value={loginPassword}
              onChange={(e) => { setLoginPassword(e.target.value); clearAuthError(); }}
            />
          </div>
        </div>

        {authError && <p className="sf-err">{authError}</p>}

        <div className="sf-grow" />
        <div className="sf-foot">
          <button className="sf-btn" type="submit" disabled={busy || !loginId.trim() || !loginPassword}>
            {busy ? t("authWorking") : t("sfContinue")}
          </button>
          {/* Students have no email, so this is the only way back in. */}
          <button className="sf-linkbtn" type="button" onClick={() => setScreen("recover")}>
            {t("recForgotLink")}
          </button>
        </div>
      </form>
    </div>
  );
}
