import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { isValidClassCode } from "../../lib/community";
import { classExists } from "../../lib/remote";
import Sheet from "../shared/Sheet";
import Field from "../shared/Field";

// Lets an "individual" account join a class after the fact — reachable
// from Me. Only sets classCode, not accountType: joining a class doesn't
// make someone an educator, so it must not touch the Ideas tab
// (ExploreScreen keys that off accountType, and the School tab off
// classCode separately — see ExploreScreen.jsx). A code is valid either
// way — one of the built-in demo codes (instant, no network needed) or a
// real code an educator generated in CreateClassStep (looked up in
// Supabase's `classes` table).
export default function JoinClassSheet() {
  const { t } = useI18n();
  const { updateProfile } = useStore();
  const { closeSheet } = useUI();
  const [code, setCode] = useState("");
  const [showError, setShowError] = useState(false);
  const [checking, setChecking] = useState(false);

  async function join() {
    const codeUpper = code.trim().toUpperCase();
    if (!codeUpper) { setShowError(true); return; }
    if (isValidClassCode(codeUpper)) {
      updateProfile({ classCode: codeUpper });
      closeSheet();
      return;
    }
    setShowError(false);
    setChecking(true);
    const exists = await classExists(codeUpper);
    setChecking(false);
    if (exists) {
      updateProfile({ classCode: codeUpper });
      closeSheet();
    } else {
      setShowError(true);
    }
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

      <button className="btn" disabled={checking} onClick={join}>{checking ? t("authWorking") : t("join")}</button>
      <button className="btn2" onClick={closeSheet}>{t("cancel")}</button>
    </Sheet>
  );
}
