import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useAuth } from "../../store/AuthContext";
import { applyAgeGate } from "../../lib/remote";
import { forgetConsentStatus } from "../../lib/useConsentStatus";
import BirthdateFields, { joinBirthdate } from "../auth/BirthdateFields";
import LangToggle from "../shared/LangToggle";
import SfHead from "../onboarding/SfHead";

// An account whose age was never recorded: signup was interrupted between
// creating the account and running the age gate. Since 20261011000000 such
// an account starts locked and unable to write, so without this screen it
// would be stuck. Same question, same fields, as the signup step; the server
// then decides the path exactly as it would have at signup.
export default function AgeRequiredScreen() {
  const { t } = useI18n();
  const { signOut } = useAuth();
  const [bdY, setBdY] = useState("");
  const [bdM, setBdM] = useState("");
  const [bdD, setBdD] = useState("");
  const [classCode, setClassCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const birthdate = joinBirthdate(bdY, bdM, bdD);

  async function submit() {
    if (busy || !birthdate) return;
    setBusy(true);
    setError(null);
    const gate = await applyAgeGate(birthdate, classCode.trim() || null);
    if (!gate.ok) {
      setBusy(false);
      setError(gate.message || t("agBadDate"));
      return;
    }
    // App chose this screen from the state it fetched at sign-in; reloading
    // is how it asks again, as PendingConsentScreen does.
    forgetConsentStatus();
    window.location.reload();
  }

  return (
    <div className="view sf-view">
      <div className="sf">
        <div className="sf-screen">
          <div className="sf-inner">
            <div className="sf-top">
              <span />
              <LangToggle />
            </div>

            <SfHead>{t("agTitle")}</SfHead>
            <p className="sf-hint sf-hint-lead">{t("arSub")}</p>

            <BirthdateFields
              bdY={bdY} setBdY={setBdY}
              bdM={bdM} setBdM={setBdM}
              bdD={bdD} setBdD={setBdD}
              classCode={classCode} setClassCode={setClassCode}
              disabled={busy}
            />
            {error && <p className="sf-err" style={{ overflowWrap: "anywhere" }}>{error}</p>}

            <div className="sf-grow" />
            <div className="sf-foot">
              <button className="sf-btn" type="button" disabled={busy || !birthdate} onClick={submit}>
                {busy ? t("authWorking") : t("agContinue")}
              </button>
              <button className="btn2" type="button" onClick={signOut}>{t("logOut")}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
