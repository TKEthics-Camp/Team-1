import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useAuth } from "../../store/AuthContext";
import LangToggle from "../shared/LangToggle";
import SfHead from "../onboarding/SfHead";

// Start Flow 1 in the Figma. The design labels the first field "Username";
// sign-in still runs on email because Supabase auth is email-based — swapping
// it for usernames is the separate backend change, so the field stays email
// here and only the look has moved over.
export default function AuthScreen() {
  const { t } = useI18n();
  const { signUp, signIn, authError, clearAuthError } = useAuth();
  const [mode, setMode] = useState("signIn"); // "signIn" | "signUp"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  function switchMode() {
    clearAuthError();
    setConfirmSent(false);
    setMode((m) => (m === "signIn" ? "signUp" : "signIn"));
  }

  async function submit(e) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    const result = mode === "signIn"
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password);
    setBusy(false);
    if (result.ok && result.needsConfirmation) setConfirmSent(true);
  }

  return (
    <div className="view sf-view">
      <form className="sf" onSubmit={submit}>
        <div className="sf-bar">
          <div className="sf-grow" />
          <LangToggle />
        </div>

        <SfHead>{mode === "signIn" ? t("sfLogIn") : t("sfSignUp")}</SfHead>

        <div className="sf-stack">
          <div>
            <label className="sf-label" htmlFor="sf-email">{t("authEmail")}</label>
            <input
              id="sf-email"
              className="sf-field"
              type="email"
              autoComplete="email"
              placeholder={t("authEmailPh")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="sf-label" htmlFor="sf-password">{t("authPassword")}</label>
            <input
              id="sf-password"
              className="sf-field"
              type="password"
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              minLength={6}
              placeholder={t("authPasswordPh")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {authError && <p className="sf-err">{authError}</p>}
        {confirmSent && <p className="sf-muted" style={{ marginTop: 10 }}>{t("authConfirmSent")}</p>}

        <div className="sf-grow" />
        <div className="sf-foot">
          <button
            type="button"
            className="sf-linkbtn"
            style={{ padding: "0 0 14px" }}
            onClick={switchMode}
          >
            {mode === "signIn" ? t("sfNoAccount") : t("sfHaveAccount")}
          </button>
          <button className="sf-btn" type="submit" disabled={busy || !email.trim() || !password}>
            {busy ? t("authWorking") : t("sfContinue")}
          </button>
        </div>
      </form>
    </div>
  );
}
