import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import {
  describeGuardianConsent,
  confirmGuardianConsent,
  withdrawGuardianConsent,
  deleteAccountAsGuardian,
} from "../../lib/remote";
import LangToggle from "../shared/LangToggle";

// What a guardian sees when they open the link in the email.
//
// They are not a user of this app and never will be. There is no account,
// no password, and nothing to install — the token in the URL is the only
// credential, and this page is reachable with no session at all, which is
// why App renders it before the auth gate rather than inside the router.
//
// The same link does everything a parent is entitled to, for as long as the
// account exists: agree, agree again, take it back, or have the whole account
// deleted (COPPA; Apple 5.1.1(ii)). It is the only thing the parent holds, so
// it has to be enough.
//
// It is deliberately plain. A parent deciding what software may do with
// their child's photographs should be reading sentences, not working out an
// interface.
export default function GuardianConsentPage({ token }) {
  const { t, lang } = useI18n();
  const [info, setInfo] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(null); // null | "withdraw" | "delete"

  async function load() {
    setInfo(await describeGuardianConsent(token));
  }
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function agree() {
    if (busy) return;
    setBusy(true);
    const result = await confirmGuardianConsent(token);
    setBusy(false);
    setOutcome(result.result === "ok" ? (result.step === 1 ? "agreed1" : "agreed2") : result.result);
  }

  // Both of these take two taps. They are the two things on this page that
  // cannot be undone from here, and a parent skimming on a phone should not
  // be able to do either by brushing the screen.
  async function withdraw() {
    if (armed !== "withdraw") { setArmed("withdraw"); return; }
    setBusy(true);
    const result = await withdrawGuardianConsent(token);
    setBusy(false);
    setArmed(null);
    if (result.result === "ok" || result.result === "already") { await load(); setOutcome("withdrawn"); }
    else setOutcome("error");
  }

  async function removeAll() {
    if (armed !== "delete") { setArmed("delete"); return; }
    setBusy(true);
    const result = await deleteAccountAsGuardian(token);
    setBusy(false);
    setArmed(null);
    setOutcome(result.result === "ok" ? "deleted" : "error");
  }

  if (!info) return <div className="sf-screen"><div className="sf-inner" /></div>;

  const valid = info.result === "ok";
  const revoked = valid && info.status === "revoked";
  const agreedOnce = valid && !!info.step1_confirmed_at;
  const thisStepDone = valid && (info.step === 1 ? !!info.step1_confirmed_at : !!info.step2_confirmed_at);
  const fullyActive = valid && info.status === "active";
  const name = valid ? info.child_name : "";

  let title;
  let body;
  if (outcome === "deleted") { title = t("gcDeletedTitle"); body = t("gcDeletedBody"); }
  else if (outcome === "error") { title = t("gcErrorTitle"); body = t("gcErrorBody"); }
  else if (!valid) { title = t("gcInvalidTitle"); body = t("gcInvalidBody"); }
  else if (revoked) { title = t("gcRevokedTitle"); body = t("gcRevokedBody"); }
  else if (outcome === "agreed1") { title = t("gcStep1DoneTitle"); body = t("gcStep1DoneBody"); }
  else if (outcome === "agreed2") { title = t("gcStep2DoneTitle"); body = t("gcStep2DoneBody"); }
  else if (outcome === "too_soon") { title = t("gcTooSoonTitle"); body = t("gcTooSoonBody"); }
  else if (fullyActive) { title = t("gcActiveTitle"); body = t("gcActiveBody"); }
  else if (thisStepDone) { title = t("gcAlreadyTitle"); body = t("gcWaitingSecondBody"); }

  const showForm = valid && !revoked && !outcome && !thisStepDone && !fullyActive;
  const showManage = valid && outcome !== "deleted" && outcome !== "error";
  const policyBase = import.meta.env.BASE_URL || "/";

  return (
    <div className="sf-screen">
      <div className="sf-inner consent-page">
        <div className="sf-top">
          <span />
          <LangToggle />
        </div>

        {showForm ? (
          <>
            <h1 className="consent-h">{info.step === 2 ? t("gcStep2Title") : t("gcTitle")}</h1>
            <p className="sf-hint">
              {info.step === 2
                ? t("gcStep2Sub")
                : (lang === "en"
                    ? `A child using the name "${name}" has asked to use Forest.`
                    : `一位使用“${name}”这个名字的孩子想要使用 Forest。`)}
            </p>

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

            <p className="consent-fine">{t("gcTwoStepNote")}</p>
            <p className="consent-fine">{t("gcCanWithdraw")}</p>
            <p className="consent-fine">
              <a href={policyBase + "privacy"}>{t("privacyTitle")}</a>
              {"  ·  "}
              <a href={policyBase + "terms"}>{t("termsTitle")}</a>
            </p>
            <p className="consent-fine">{t("gcVersions")} {info.terms_version} / {info.privacy_version}</p>

            <div className="sf-foot">
              <button className="sf-btn" disabled={busy} onClick={agree}>
                {busy ? t("authWorking") : (info.step === 2 ? t("gcAgreeAgain") : t("gcAgree"))}
              </button>
              <p className="consent-fine">{t("gcDeclineNote")}</p>
            </div>
          </>
        ) : (
          <>
            <h1 className="consent-h">{title}</h1>
            <p className="sf-hint">{body}</p>
            {name && valid && outcome !== "deleted" && (
              <p className="consent-fine">{t("gcAccountName")} {name}</p>
            )}
          </>
        )}

        {showManage && (
          <div className="consent-block consent-manage">
            <h2 className="consent-h2">{t("gcManageTitle")}</h2>

            {agreedOnce && !revoked && (
              <>
                <p className="consent-fine">{t("gcWithdrawNote")}</p>
                <button className="btn2 consent-action" disabled={busy} onClick={withdraw}>
                  {armed === "withdraw" ? t("gcWithdrawConfirm") : t("gcWithdraw")}
                </button>
              </>
            )}

            <p className="consent-fine">{agreedOnce || revoked ? t("gcDeleteNote") : t("gcDeleteNoteDecline")}</p>
            <button className="btn2 btn-danger consent-action" disabled={busy} onClick={removeAll}>
              {armed === "delete" ? t("gcDeleteConfirm") : t("gcDelete")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
