import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import Sheet from "../shared/Sheet";
import Field from "../shared/Field";

export default function EditProfileSheet() {
  const { t } = useI18n();
  const { profile, saveProfile } = useStore();
  const { closeSheet } = useUI();
  const [name, setName] = useState(profile.name);
  const nameRef = useRef(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  function save() {
    const nm = name.trim();
    if (!nm) { nameRef.current?.focus(); return; }
    saveProfile({ ...profile, name: nm });
    closeSheet();
  }

  return (
    <Sheet onClose={closeSheet}>
      <h2>{t("editProfile")}</h2>
      <Field label={t("name")}>
        <input ref={nameRef} type="text" maxLength={20} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <button className="btn" onClick={save}>{t("save")}</button>
      <button className="btn2" onClick={closeSheet}>{t("cancel")}</button>
    </Sheet>
  );
}
