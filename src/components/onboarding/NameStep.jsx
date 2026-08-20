import { useEffect, useRef } from "react";
import { useI18n } from "../../i18n/I18nContext";
import SfHead from "./SfHead";

// Not in the Figma — the Figma expects the username to come from the Log In
// screen, which needs the username-instead-of-email auth change first. Until
// then the display name is still collected here, in the new look.
//
// `onNext` reserves the name server-side (unique-index check) before
// advancing, so a taken username is caught right here rather than after
// the rest of onboarding is filled in — see Onboarding's tryAdvanceFromName.
export default function NameStep({ name, setName, onNext, busy, error, clearError }) {
  const { t } = useI18n();
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const canGo = !!name.trim() && !busy;

  return (
    <>
      <SfHead>{t("sfNameTitle")}</SfHead>

      <label className="sf-label" htmlFor="sf-name">{t("sfUsername")}</label>
      <input
        id="sf-name"
        ref={inputRef}
        className="sf-field"
        type="text"
        maxLength={20}
        placeholder={t("namePh")}
        value={name}
        autoComplete="off"
        disabled={busy}
        onChange={(e) => { setName(e.target.value); clearError && clearError(); }}
        onKeyDown={(e) => { if (e.key === "Enter" && canGo) onNext(); }}
      />
      {error && <p className="sf-err">{t(error)}</p>}

      <div className="sf-grow" />
      <div className="sf-foot">
        <button className="sf-btn" disabled={!canGo} onClick={() => canGo && onNext()}>
          {busy ? t("sfChecking") : t("sfContinue")}
        </button>
      </div>
    </>
  );
}
