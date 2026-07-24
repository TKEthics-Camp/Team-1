import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { isValidClassCode } from "../../lib/community";
import Field from "../shared/Field";

// Only shown for "school or group" accounts — a real (if tiny) gate: the
// code has to match one of the demo class codes, or you can't continue.
export default function ClassCodeStep({ code, setCode, onNext }) {
  const { t } = useI18n();
  const [tried, setTried] = useState(false);

  const valid = isValidClassCode(code);
  const showError = tried && !valid;

  function next() {
    if (!valid) { setTried(true); return; }
    onNext();
  }

  return (
    <>
      <h2>{t("classCodeTitle")}</h2>
      <p>{t("classCodeSub")}</p>

      <div className="safe-note">
        <span aria-hidden="true">👀</span>
        <span>{t("classCodeWarning")}</span>
      </div>

      <Field label={t("classCodePh")}>
        <input
          type="text"
          autoCapitalize="characters"
          maxLength={20}
          placeholder={t("classCodePh")}
          value={code}
          onChange={(e) => { setCode(e.target.value); setTried(false); }}
        />
        <span className="hint">{t("classCodeHint")}</span>
        {showError && <span className="field-error">{t("classCodeError")}</span>}
      </Field>

      <div className="grow" />
      <button className="btn" onClick={next}>{t("next")}</button>
    </>
  );
}
