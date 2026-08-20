import { useEffect, useRef } from "react";
import { useI18n } from "../../i18n/I18nContext";
import SfHead from "./SfHead";

// Not in the Figma — the Figma expects the username to come from the Log In
// screen, which needs the username-instead-of-email auth change first. Until
// then the display name is still collected here, in the new look.
export default function NameStep({ name, setName, onNext, error, clearError }) {
  const { t } = useI18n();
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

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
        onChange={(e) => { setName(e.target.value); clearError && clearError(); }}
        onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onNext(); }}
      />
      {error && <p className="sf-err">{t(error)}</p>}

      <div className="sf-grow" />
      <div className="sf-foot">
        <button className="sf-btn" disabled={!name.trim()} onClick={() => name.trim() && onNext()}>
          {t("sfContinue")}
        </button>
      </div>
    </>
  );
}
