import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useAuth } from "../../store/AuthContext";
import { startGuardianConsent, myConsentStatus } from "../../lib/remote";
import LangToggle from "../shared/LangToggle";
import Mascot from "../shared/Mascot";

// Where an under-14 account that signed up without a class code waits.
//
// The account exists and can be signed into — it just cannot log anything
// until a guardian has agreed twice. That is enforced in RLS, not here; this
// screen's job is to explain the wait and let the child fix a wrong number,
// which is the failure that would otherwise strand them forever.
export default function PendingConsentScreen() {
  const { t } = useI18n();
  const { signOut } = useAuth();
  const [status, setStatus] = useState(null);
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

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

        <h1 className="consent-h">{t("pcTitle")}</h1>

        {midway ? (
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

        {!midway && (
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

        <div className="sf-grow" />
        <div className="sf-foot">
          <button className="btn2" onClick={load}>{t("pcRefresh")}</button>
          <button className="btn2" onClick={signOut}>{t("logOut")}</button>
        </div>
      </div>
    </div>
  );
}
