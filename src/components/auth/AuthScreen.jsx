import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useAuth } from "../../store/AuthContext";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import Field from "../shared/Field";

// Sign-up only for now — the log-in half of this flow has moved to its own
// screen (LoginScreen), reached from the Welcome screen instead of a toggle
// here, so there's exactly one place each flow lives. This screen still
// uses the app's older visual style; a matching redesign is a follow-up.
export default function AuthScreen() {
  const { t } = useI18n();
  const { signUp, authError, clearAuthError } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    clearAuthError();
    setBusy(true);
    await signUp(username.trim(), password);
    setBusy(false);
  }

  return (
    <>
      <TopBar>
        <h1>{t("appName")}</h1>
        <LangToggle />
      </TopBar>
      <div className="view">
        <form className="onb" onSubmit={submit}>
          <h2>{t("authSignUp")}</h2>

          <Field label={t("authUsername")}>
            <input
              type="text"
              autoComplete="username"
              placeholder={t("authUsernamePh")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Field label={t("authPassword")}>
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              placeholder={t("authPasswordPh")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {authError && <div className="sub" style={{ color: "var(--danger, #d33)" }}>{authError}</div>}

          <div className="grow" />
          <button className="btn" type="submit" disabled={busy || !username.trim() || !password}>
            {busy ? t("authWorking") : t("authSignUp")}
          </button>
        </form>
      </div>
    </>
  );
}
