import { useEffect, useRef } from "react";
import { useI18n } from "../../i18n/I18nContext";

export default function NameStep({ name, setName, onNext, error, clearError }) {
  const { t } = useI18n();
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <>
      <h2>{t("yourName")}</h2>
      <input
        ref={inputRef}
        type="text"
        maxLength={20}
        placeholder={t("namePh")}
        value={name}
        autoComplete="off"
        onChange={(e) => { setName(e.target.value); clearError && clearError(); }}
        onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onNext(); }}
      />
      {error && <span className="field-error">{t(error)}</span>}
      <div className="grow" />
      <button className="btn" disabled={!name.trim()} onClick={() => name.trim() && onNext()}>{t("next")}</button>
    </>
  );
}
