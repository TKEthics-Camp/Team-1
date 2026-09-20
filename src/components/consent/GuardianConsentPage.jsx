import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { describeGuardianConsent, confirmGuardianConsent } from "../../lib/remote";
import LangToggle from "../shared/LangToggle";

// What a guardian sees when they tap the link in the text.
//
// They are not a user of this app and never will be. There is no account,
// no password, and nothing to install — the token in the URL is the only
// credential, and this page is reachable with no session at all, which is
// why App renders it before the auth gate rather than inside the router.
//
// It is deliberately plain. A parent who is being asked to agree to what a
// piece of software does with their child's photographs should be reading
// sentences, not working out an interface.
export default function GuardianConsentPage({ token }) {
  const { t, lang } = useI18n();
  const [info, setInfo] = useState(null);
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    describeGuardianConsent(token).then((d) => { if (!cancelled) setInfo(d); });
    return () => { cancelled = true; };
  }, [token]);

  async function agree() {
    if (busy) return;
    setBusy(true);
    const result = await confirmGuardianConsent(token);
    setBusy(false);
    setDone(result);
  }

  if (!info) {
    return <div className="sf-screen"><div className="sf-inner" /></div>;
  }

  const bad = info.result !== "ok";
  const step = info.step;

  return (
    <div className="sf-screen">
      <div className="sf-inner consent-page">
        <div className="sf-top">
          <span />
          <LangToggle />
        </div>

        {bad ? (
          <>
            <h1 className="consent-h">{t("gcInvalidTitle")}</h1>
            <p className="sf-hint">{t("gcInvalidBody")}</p>
          </>
        ) : done ? (
          <>
            <h1 className="consent-h">
              {done.result === "ok" && done.step === 1 ? t("gcStep1DoneTitle")
                : done.result === "ok" ? t("gcStep2DoneTitle")
                : done.result === "too_soon" ? t("gcTooSoonTitle")
                : done.result === "already" ? t("gcAlreadyTitle")
                : t("gcInvalidTitle")}
            </h1>
            <p className="sf-hint">
              {done.result === "ok" && done.step === 1 ? t("gcStep1DoneBody")
                : done.result === "ok" ? t("gcStep2DoneBody")
                : done.result === "too_soon" ? t("gcTooSoonBody")
                : done.result === "already" ? t("gcAlreadyBody")
                : t("gcInvalidBody")}
            </p>
          </>
        ) : (
          <>
            <h1 className="consent-h">
              {step === 2 ? t("gcStep2Title") : t("gcTitle")}
            </h1>
            <p className="sf-hint">
              {step === 2
                ? t("gcStep2Sub")
                : (lang === "en"
                    ? `A child using the name "${info.child_name}" has asked to use Forest.`
                    : `一位使用“${info.child_name}”这个名字的孩子想要使用 Forest。`)}
            </p>

            {/* The substance. A consent screen that does not say plainly
                what is collected and who can see it is not consent. */}
            <div className="consent-block">
              <h2 className="consent-h2">{t("gcCollectsTitle")}</h2>
              <ul className="consent-list">
                <li>{t("gcCollectsPhotos")}</li>
                <li>{t("gcCollectsVoice")}</li>
                <li>{t("gcCollectsText")}</li>
              </ul>
            </div>

            <div className="consent-block consent-promise">
              <h2 className="consent-h2">{t("gcNeverTitle")}</h2>
              <ul className="consent-list">
                <li>{t("gcNeverShared")}</li>
                <li>{t("gcNeverSearchable")}</li>
                <li>{t("gcNeverPublic")}</li>
              </ul>
              <p className="consent-fine">{t("gcNeverNote")}</p>
            </div>

            <p className="consent-fine">
              {t("gcTwoStepNote")}
            </p>
            <p className="consent-fine">
              {t("gcVersions")} {info.terms_version} / {info.privacy_version}
            </p>

            <div className="sf-foot">
              <button className="sf-btn" disabled={busy} onClick={agree}>
                {busy ? t("authWorking") : (step === 2 ? t("gcAgreeAgain") : t("gcAgree"))}
              </button>
              <p className="consent-fine">{t("gcDeclineNote")}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
