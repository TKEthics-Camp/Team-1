import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useUI } from "../../ui/UIContext";
import { setRecoveryCode, hasRecoveryCode } from "../../lib/remote";
import { generateRecoveryCode } from "../../lib/recoveryCode";
import Sheet from "../shared/Sheet";

// Gets the student a recovery code, which is the only way back into an
// account whose password has been forgotten — they have no email, so there
// is no reset link and nobody to ask.
//
// The code is shown exactly once, here, at the moment it is generated. It
// is stored server-side only as a bcrypt hash, so there is genuinely no
// way to show it again later: a code the app could read back is a code a
// borrowed, already-unlocked phone could read back. Losing the paper means
// generating a new one, which is fine and free.
export default function RecoveryCodeSheet() {
  const { t } = useI18n();
  const { closeSheet } = useUI();
  const [existing, setExisting] = useState(null); // null = still checking
  const [code, setCode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hasRecoveryCode().then((has) => { if (!cancelled) setExisting(has); });
    return () => { cancelled = true; };
  }, []);

  async function generate() {
    if (busy) return;
    setBusy(true);
    setFailed(null);
    const fresh = generateRecoveryCode();
    const result = await setRecoveryCode(fresh);
    setBusy(false);
    // The server's own wording, not just "try again": the failures this can
    // hit are configuration problems on the database, and trying again will
    // reproduce them forever without ever saying what is wrong.
    if (!result.ok) { setFailed(result.message); return; }
    setCode(fresh);
    setExisting(true);
  }

  function copy() {
    if (!navigator.clipboard || !code) return;
    navigator.clipboard.writeText(code).then(() => setCopied(true)).catch(() => {});
  }

  return (
    <Sheet onClose={closeSheet}>
      <h2>{t("recTitle")}</h2>

      {code ? (
        <>
          <p className="sub">{t("recShownOnce")}</p>
          <div className="rec-code" aria-label={t("recTitle")}>{code}</div>
          <div className="safe-note">
            <span aria-hidden="true">✍️</span>
            <span>{t("recWriteItDown")}</span>
          </div>
          {navigator.clipboard && (
            <button className="btn2" onClick={copy}>{copied ? t("recCopied") : t("recCopy")}</button>
          )}
          <button className="btn" onClick={closeSheet}>{t("recDone")}</button>
        </>
      ) : (
        <>
          <p className="sub">{t("recSub")}</p>
          {existing === true && <div className="sub">{t("recAlreadyHave")}</div>}
          {existing === false && (
            <div className="safe-note">
              <span aria-hidden="true">⚠️</span>
              <span>{t("recNoneYet")}</span>
            </div>
          )}
          {failed && (
            <div className="field-error" style={{ overflowWrap: "anywhere" }}>
              {t("recFailed")} {failed}
            </div>
          )}
          <button className="btn" disabled={busy || existing === null} onClick={generate}>
            {existing ? t("recRegenerate") : t("recGenerate")}
          </button>
          <button className="btn2" onClick={closeSheet}>{t("cancel")}</button>
        </>
      )}
    </Sheet>
  );
}
