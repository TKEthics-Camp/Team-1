import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import Sheet from "../shared/Sheet";
import Field from "../shared/Field";

// Lets an "individual" account join a class with the code their teacher's
// org account generated at onboarding. Only sets classCode, never accountType: joining a class doesn't
// make a student an org account, so it must not swap out their Ideas tab —
// ExploreScreen unlocks the School tab off classCode directly.
export default function JoinClassSheet() {
  const { t } = useI18n();
  const { joinClass } = useStore();
  const { closeSheet } = useUI();
  const [code, setCode] = useState("");
  const [showError, setShowError] = useState(false);
  const [checking, setChecking] = useState(false);

  async function join() {
    if (checking || !code.trim()) return;
    setChecking(true);
    const result = await joinClass(code);
    setChecking(false);
    if (!result.ok) { setShowError(true); return; }
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
          onChange={(e) => { setCode(e.target.value); setShowError(false); }}
        />
        <span className="hint">{t("classCodeHint")}</span>
        {showError && <span className="field-error">{t("classCodeError")}</span>}
      </Field>

      <button className="btn" onClick={join} disabled={checking}>
        {checking ? t("classCodeChecking") : t("join")}
      </button>
      <button className="btn2" onClick={closeSheet}>{t("cancel")}</button>
    </Sheet>
  );
}
