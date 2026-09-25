import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useAuth } from "../../store/AuthContext";
import { startGuardianConsent, myConsentStatus, joinClassFromPending, deleteMyAccount } from "../../lib/remote";
import { forgetConsentStatus } from "../../lib/useConsentStatus";
import LangToggle from "../shared/LangToggle";
import Mascot from "../shared/Mascot";

// Where an under-14 account that signed up without a class code waits.
//
// The account exists and can be signed into — it just cannot log anything
// until a guardian has agreed twice. That is enforced in RLS, not here; this
// screen's job is to explain the wait and let the child fix a wrong number,
// which is the failure that would otherwise strand them forever.
// `withdrawn` is the screen a child sees after their guardian took permission
// back. It has no class-code box and no way to send a new request, by
// design: anything the child could do from here would undo the parent's
// decision. What it does keep is deletion — Apple 5.1.1(v) requires every
// account to be deletable from inside the app, and this screen is the only
// part of the app these accounts can reach.
export default function PendingConsentScreen({ withdrawn = false }) {
  const { t } = useI18n();
  const { signOut, user } = useAuth();
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  async function deleteAccount() {
    if (!deleteArmed) { setDeleteArmed(true); return; }
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteMyAccount(user && user.id);
    if (!result.ok) {
      setDeleting(false);
      setDeleteArmed(false);
      setDeleteError(result.message);
      return;
    }
    await signOut();
  }
  const [status, setStatus] = useState(null);
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeError, setCodeError] = useState(null);

  async function load() {
    setStatus(await myConsentStatus());
  }

  useEffect(() => { load(); }, []);

  async function send() {
    if (busy || !contact.trim()) return;
    setBusy(true);
    setError(null);
    const result = await startGuardianConsent(contact.trim());
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    setSent(true);
    setContact("");
    load();
  }

  // The way out if the email never comes. A class code puts the account on
  // the school path, which needs no guardian email — the same code works at
  // signup, so this is the design rather than a loophole.
  async function submitClassCode() {
    if (codeBusy || !code.trim()) return;
    setCodeBusy(true);
    setCodeError(null);
    const result = await joinClassFromPending(code.trim());
    setCodeBusy(false);
    if (result.status === "invalid") { setCodeError(t("pcCodeWrong")); return; }
    if (result.status !== "ok") { setCodeError(result.message); return; }
    // App decided to show this screen from consent state it fetched at
    // sign-in. Reloading is the simplest way to have it ask again, and it
    // happens exactly once, at the moment the account is let in.
    forgetConsentStatus();
    window.location.reload();
  }

  const waiting = status && status.has_request && !status.step1_confirmed_at;
  const midway = status && status.step1_confirmed_at && !status.step2_confirmed_at;

  return (
    <div className="sf-screen">
      <div className="sf-inner">
        <div className="sf-top">
          <span />
          <LangToggle />
        </div>

        <div className="center" style={{ marginBottom: 8 }}>
          <Mascot action="sleep" size={96} />
        </div>

        <h1 className="consent-h">{withdrawn ? t("pcWithdrawnTitle") : t("pcTitle")}</h1>

        {withdrawn ? (
          <p className="sf-hint">{t("pcWithdrawnBody")}</p>
        ) : midway ? (
          <>
            <p className="sf-hint">{t("pcMidwayBody")}</p>
            <p className="consent-fine">{t("pcMidwayWhen")}</p>
          </>
        ) : waiting ? (
          <>
            <p className="sf-hint">{t("pcWaitingBody")}</p>
            <p className="consent-fine">{t("pcWrongNumber")}</p>
          </>
        ) : (
          <p className="sf-hint">{t("pcAskBody")}</p>
        )}

        {!withdrawn && !midway && (
          <div className="sf-stack">
            <div>
              <label className="sf-label" htmlFor="pc-email">{t("pcEmailLabel")}</label>
              <input
                id="pc-email"
                className="sf-field"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="off"
                spellCheck="false"
                disabled={busy}
                value={contact}
                onChange={(e) => { setContact(e.target.value); setError(null); }}
              />
            </div>
            {error && <p className="sf-err" style={{ overflowWrap: "anywhere" }}>{error}</p>}
            {sent && !error && <p className="sf-hint">{t("pcSent")}</p>}
            <button className="sf-btn" disabled={busy || !contact.trim()} onClick={send}>
              {busy ? t("authWorking") : (waiting ? t("pcResend") : t("pcSend"))}
            </button>
          </div>
        )}

        {!withdrawn && <div className="sf-optional">
          <label className="sf-label" htmlFor="pc-code">{t("pcCodeLabel")}</label>
          <div className="pc-code-row">
            <input
              id="pc-code"
              className="sf-field"
              type="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck="false"
              disabled={codeBusy}
              value={code}
              onChange={(e) => { setCode(e.target.value); setCodeError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") submitClassCode(); }}
            />
            <button className="btn2" disabled={codeBusy || !code.trim()} onClick={submitClassCode}>
              {codeBusy ? t("authWorking") : t("pcCodeGo")}
            </button>
          </div>
          {codeError && <p className="sf-err" style={{ overflowWrap: "anywhere" }}>{codeError}</p>}
          <p className="sf-hint">{t("pcCodeHint")}</p>
        </div>}

        <div className="sf-grow" />
        <div className="sf-foot">
          {!withdrawn && <button className="btn2" onClick={load}>{t("pcRefresh")}</button>}
          <button className="btn2" onClick={signOut}>{t("logOut")}</button>
          {deleteError && <p className="sf-err" style={{ overflowWrap: "anywhere" }}>{deleteError}</p>}
          <button className="btn2 btn-danger" disabled={deleting} onClick={deleteAccount}>
            {deleteArmed ? t("pcDeleteConfirm") : t("pcDeleteAccount")}
          </button>
        </div>
      </div>
    </div>
  );
}
