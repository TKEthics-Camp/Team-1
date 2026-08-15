import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import Sheet from "../shared/Sheet";
import Field from "../shared/Field";

const ERROR_KEY = { empty: "usernameRequired", taken: "usernameTaken", error: "usernameError" };

export default function UsernameSheet() {
  const { t } = useI18n();
  const { profile, changeUsername } = useStore();
  const { closeSheet } = useUI();
  const [name, setName] = useState((profile && profile.name) || "");
  const [errorKey, setErrorKey] = useState(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    const result = await changeUsername(name);
    setSaving(false);
    if (result.ok) { closeSheet(); return; }
    setErrorKey(ERROR_KEY[result.reason] || "usernameError");
  }

  return (
    <Sheet onClose={closeSheet}>
      <h2>{t("usernameTitle")}</h2>
      <p className="sub">{t("usernameSub")}</p>

      <Field label={t("namePh")}>
        <input
          type="text"
          maxLength={20}
          placeholder={t("namePh")}
          value={name}
          autoComplete="off"
          onChange={(e) => { setName(e.target.value); setErrorKey(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") save(); }}
        />
        {errorKey && <span className="field-error">{t(errorKey)}</span>}
      </Field>

      <button className="btn" disabled={saving} onClick={save}>{t("save")}</button>
      <button className="btn2" onClick={closeSheet}>{t("cancel")}</button>
    </Sheet>
  );
}
