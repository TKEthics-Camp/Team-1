import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useAuth } from "../../store/AuthContext";
import Mascot from "../shared/Mascot";

// The one and only log-in screen (see the team's Figma design) — reached
// from Welcome's "Already have an account?", with a back arrow returning
// there. There is deliberately no link onward to sign up here: Welcome is
// the single place that flow branches from.
export default function LoginScreen({ onBack }) {
  const { t } = useI18n();
  const { signIn, authError, clearAuthError } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    clearAuthError();
    setBusy(true);
    await signIn(username.trim(), password);
    setBusy(false);
  }

  return (
    <div className="login-screen">
      <button type="button" className="login-back" aria-label={t("back")} onClick={onBack}>←</button>
      <div className="login-header">
        <Mascot size={68} />
        <h1 className="login-title">{t("authSignIn")}</h1>
      </div>
      <form className="login-form" onSubmit={submit}>
        <label className="login-label" htmlFor="login-username">{t("authUsername")}</label>
        <input
          id="login-username"
          className="login-input"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => { setUsername(e.target.value); clearAuthError(); }}
        />
        <label className="login-label" htmlFor="login-password">{t("authPassword")}</label>
        <input
          id="login-password"
          className="login-input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); clearAuthError(); }}
        />
        {authError && <div className="login-error">{authError}</div>}
        <div className="grow" />
        <button type="submit" className="welcome-start-btn" disabled={busy || !username.trim() || !password}>
          {busy ? t("authWorking") : t("authContinue")}
        </button>
      </form>
    </div>
  );
}
