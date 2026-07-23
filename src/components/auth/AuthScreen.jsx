import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useAuth } from "../../store/AuthContext";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import Field from "../shared/Field";

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
    <>
      <TopBar>
        <h1>{t("appName")}</h1>
        <LangToggle />
      </TopBar>
      <div className="view">
        <form className="onb" onSubmit={submit}>
          <h2>{mode === "signIn" ? t("authSignIn") : t("authSignUp")}</h2>

          <Field label={t("authEmail")}>
            <input
              type="email"
              autoComplete="email"
              placeholder={t("authEmailPh")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label={t("authPassword")}>
            <input
              type="password"
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              minLength={6}
              placeholder={t("authPasswordPh")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {authError && <div className="sub" style={{ color: "var(--danger, #d33)" }}>{authError}</div>}
          {confirmSent && <div className="sub">{t("authConfirmSent")}</div>}

          <div className="grow" />
          <button className="btn" type="submit" disabled={busy || !email.trim() || !password}>
            {busy ? t("authWorking") : mode === "signIn" ? t("authSignIn") : t("authSignUp")}
          </button>
          <button className="btn2" type="button" onClick={switchMode}>
            {mode === "signIn" ? t("authSwitchToSignUp") : t("authSwitchToSignIn")}
          </button>
        </form>
      </div>
    </>
  );
}
