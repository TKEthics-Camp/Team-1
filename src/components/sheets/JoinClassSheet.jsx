import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { isValidClassCode } from "../../lib/community";
import Sheet from "../shared/Sheet";
import Field from "../shared/Field";

// Lets an "individual" account join a class with the code their teacher's
// org account generated at onboarding. Only sets classCode, never accountType: joining a class doesn't
// make a student an org account, so it must not swap out their Ideas tab —
// ExploreScreen unlocks the School tab off classCode directly.
export default function JoinClassSheet() {
  const { t } = useI18n();
  const { updateProfile } = useStore();
  const { closeSheet } = useUI();
  const [code, setCode] = useState("");
  const [tried, setTried] = useState(false);

  const valid = isValidClassCode(code);
  const showError = tried && !valid;

  function join() {
    if (!valid) { setTried(true); return; }
    updateProfile({ classCode: code.trim().toUpperCase() });
    closeSheet();
  }

  return (
    <Sheet onClose={closeSheet}>
      <h2>{t("classCodeTitle")}</h2>
      <p className="sub">{t("classCodeSub")}</p>

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

      <button className="btn" onClick={join}>{t("join")}</button>
      <button className="btn2" onClick={closeSheet}>{t("cancel")}</button>
    </Sheet>
  );
}
