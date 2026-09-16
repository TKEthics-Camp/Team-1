import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useAuth } from "../../store/AuthContext";
import { redeemRecoveryCode } from "../../lib/remote";
import { usernameToEmail } from "../../lib/syntheticEmail";
import LangToggle from "../shared/LangToggle";
import SfHead from "../onboarding/SfHead";

// The way back in for a student who has forgotten their password. They have
// no email, so this is the only path that exists — see PRD §14.3 and
// 20260912030000.
//
// Takes the username and the recovery code they wrote down, sets a new
// password, and signs them straight in, because being told "now go and log
// in" after proving who you are is a pointless extra step for a child who
// has already had a bad day.
export default function RecoverFlow({ onBack, onDone }) {
  const { t } = useI18n();
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorKey, setErrorKey] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (password.length < 6) { setErrorKey("pwTooShort"); return; }
    if (password !== confirm) { setErrorKey("authPasswordMismatch"); return; }

    setBusy(true);
    setErrorKey(null);
    setServerError(null);
    // The code is typed off paper, so how it arrives must not matter:
    // spacing, case and dash grouping are all stripped before comparison.
    // canonicalRecoveryCode in lib/remote.js is the one place that decides
    // what a code actually is, and both halves of this feature go through it.
    const result = await redeemRecoveryCode(username.trim(), code, password);

    if (result.status !== "ok") {
      setBusy(false);
      setErrorKey(result.status === "invalid" ? "recBadCode" : "recFailed");
      if (result.message) setServerError(result.message);
      return;
    }

    // Educators sign in with a real email; students with the address
    // derived from their username. A typed username is never an email, so
    // deriving is right here — an educator who lands on this screen will
    // have typed their email, which usernameToEmail would mangle.
    const identifier = username.includes("@") ? username.trim() : usernameToEmail(username);
    const signedIn = await signIn(identifier, password);
    setBusy(false);
    if (signedIn.ok) { onDone(); return; }
    // The password was genuinely changed; only the auto sign-in failed.
    setErrorKey("recResetNowLogIn");
  }

  return (
    <div className="sf-screen">
      <form className="sf-inner" onSubmit={submit}>
        <div className="sf-top">
          <button className="sf-back" type="button" onClick={onBack} aria-label={t("back")}>‹</button>
          <LangToggle />
        </div>

        <SfHead>{t("recForgotTitle")}</SfHead>
        <p className="sf-hint">{t("recForgotSub")}</p>

        <div className="sf-stack">
          <div>
            <label className="sf-label" htmlFor="rc-user">{t("sfUsername")}</label>
            <input
              id="rc-user" className="sf-field" type="text" autoComplete="username"
              disabled={busy}
              value={username}
              onChange={(e) => { setUsername(e.target.value); setErrorKey(null); setServerError(null); }}
            />
          </div>
          <div>
            <label className="sf-label" htmlFor="rc-code">{t("recCodeLabel")}</label>
            <input
              id="rc-code" className="sf-field" type="text"
              autoCapitalize="characters" autoComplete="off" spellCheck="false"
              placeholder="ABCD-EFGH-JKMN"
              disabled={busy}
              value={code}
              onChange={(e) => { setCode(e.target.value); setErrorKey(null); setServerError(null); }}
            />
          </div>
          <div>
            <label className="sf-label" htmlFor="rc-pw">{t("pwNew")}</label>
            <input
              id="rc-pw" className="sf-field" type="password" autoComplete="new-password"
              minLength={6} placeholder={t("authPasswordPh")}
              disabled={busy}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrorKey(null); }}
            />
          </div>
          <div>
            <label className="sf-label" htmlFor="rc-pw2">{t("pwConfirm")}</label>
            <input
              id="rc-pw2" className="sf-field" type="password" autoComplete="new-password"
              minLength={6}
              disabled={busy}
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setErrorKey(null); }}
            />
          </div>
        </div>

        {errorKey && <p className="sf-err">{t(errorKey)}</p>}
        {serverError && <p className="sf-err" style={{ overflowWrap: "anywhere" }}>{serverError}</p>}

        <div className="sf-grow" />
        <div className="sf-foot">
          <button
            className="sf-btn"
            type="submit"
            disabled={busy || !username.trim() || !code.trim() || !password || !confirm}
          >
            {busy ? t("authWorking") : t("recSetNewPassword")}
          </button>
        </div>
      </form>
    </div>
  );
}
