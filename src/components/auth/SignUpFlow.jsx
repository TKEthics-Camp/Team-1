import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useAuth } from "../../store/AuthContext";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import AccountTypeStep from "../onboarding/AccountTypeStep";
import Mascot from "../shared/Mascot";

// The sign-up half of the startflow: which account type, then the actual
// account (this is where signUp() runs — everything after is Onboarding's
// job, which now starts past all of this). Reached only from Welcome's
// Start; the only way back out is this same Start button, via the account
// type step's back arrow.
export default function SignUpFlow({ onBack }) {
  const { t } = useI18n();
  const { signUp, authError, clearAuthError } = useAuth();
  const [step, setStep] = useState("accountType"); // "accountType" | "setup"
  const [accountType, setAccountType] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [confirmError, setConfirmError] = useState(null);
  const [busy, setBusy] = useState(false);

  const isOrg = accountType === "org";

  async function submit(e) {
    e.preventDefault();
    setConfirmError(null);
    clearAuthError();
    if (!username.trim() || !password) return;
    if (password !== confirmPassword) { setConfirmError(t("authPasswordMismatch")); return; }
    setBusy(true);
    await signUp(username.trim(), password, { accountType: accountType || "individual", email: isOrg ? email.trim() : null });
    setBusy(false);
  }

  if (step === "accountType") {
    return (
      <>
        <TopBar>
          <button className="icon" aria-label={t("back")} onClick={onBack}>←</button>
          <h1>{t("appName")}</h1>
          <LangToggle />
        </TopBar>
        <div className="view">
          <div className="onb">
            <AccountTypeStep value={accountType} setType={setAccountType} onNext={() => setStep("setup")} />
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="login-screen">
      <button type="button" className="login-back" aria-label={t("back")} onClick={() => setStep("accountType")}>←</button>
      <div className="login-header">
        <Mascot size={68} />
        <h1 className="login-title">{t("setupAccountTitle")}</h1>
      </div>
      <form className="login-form" onSubmit={submit}>
        <label className="login-label" htmlFor="su-username">{t("authUsername")}</label>
        <input
          id="su-username" className="login-input" type="text" autoComplete="username"
          value={username} onChange={(e) => { setUsername(e.target.value); clearAuthError(); }}
        />

        <label className="login-label" htmlFor="su-password">{t("authPassword")}</label>
        <input
          id="su-password" className="login-input" type="password" autoComplete="new-password" minLength={6}
          value={password} onChange={(e) => { setPassword(e.target.value); setConfirmError(null); }}
        />

        <label className="login-label" htmlFor="su-confirm">{t("authConfirmPassword")}</label>
        <input
          id="su-confirm" className="login-input" type="password" autoComplete="new-password" minLength={6}
          value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(null); }}
        />

        {isOrg && (
          <>
            <label className="login-label" htmlFor="su-email">{t("authEducatorEmail")}</label>
            <input
              id="su-email" className="login-input" type="email" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </>
        )}

        {(confirmError || authError) && <div className="login-error">{confirmError || authError}</div>}
        <div className="grow" />
        <button
          type="submit" className="welcome-start-btn"
          disabled={busy || !username.trim() || !password || !confirmPassword || (isOrg && !email.trim())}
        >
          {busy ? t("authWorking") : t("authContinue")}
        </button>
      </form>
    </div>
  );
}
