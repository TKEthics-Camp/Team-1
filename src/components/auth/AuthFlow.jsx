import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useAuth } from "../../store/AuthContext";
import { supabase } from "../../lib/supabase";
import { usernameToEmail } from "../../lib/syntheticEmail";
import LangToggle from "../shared/LangToggle";
import SfHead from "../onboarding/SfHead";
import AccountTypeStep from "../onboarding/AccountTypeStep";
import Mascot from "../shared/Mascot";

// Account type has to be picked before credentials, not after (unlike the
// old email-first flow), because it decides the one real difference: an
// educator gives a real email, an individual never does — see
// lib/syntheticEmail. Username is reserved the moment the account is
// created (same server-side uniqueness check that used to live in
// Onboarding's name step, just moved to where the username is actually
// collected now) rather than at the end of onboarding.
export default function AuthFlow() {
  const { t } = useI18n();
  const { signUp, signIn, authError, clearAuthError } = useAuth();
  const [screen, setScreen] = useState("welcome"); // "welcome" | "signup" | "login"
  const [signupStep, setSignupStep] = useState("accountType"); // "accountType" | "credentials"
  const [accountType, setAccountType] = useState(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [localError, setLocalError] = useState(null);
  const [busy, setBusy] = useState(false);

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
    const signupEmail = isOrg ? email.trim() : usernameToEmail(trimmedUsername);
    const result = await signUp(signupEmail, password, { username: trimmedUsername, accountType });
    if (!result.ok) { setBusy(false); return; }

    // The `users` row already exists (the on_auth_user_created trigger made
    // it the moment signUp() above succeeded) — this fills in the display
    // name and account type, and is where a taken username actually surfaces.
    // If it fails, the auth account was still created, so it's rolled back
    // by signing out rather than left as a signed-in account with no valid
    // display name — Onboarding trusts that name is already reserved.
    const { error } = await supabase
      .from("users")
      .update({ display_name: trimmedUsername, account_type: accountType })
      .eq("id", result.userId);
    setBusy(false);
    if (error) {
      console.error("Failed to reserve username:", error);
      await supabase.auth.signOut();
      setLocalError(error.code === "23505" ? "usernameTaken" : "usernameError");
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
            <Mascot size={132} className="sf-hero" />
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
            onNext={() => setSignupStep("credentials")}
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
              onClick={() => setSignupStep("accountType")}
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
        </div>
      </form>
    </div>
  );
}
