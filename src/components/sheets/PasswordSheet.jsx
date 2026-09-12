import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useAuth } from "../../store/AuthContext";
import { useUI } from "../../ui/UIContext";
import Sheet from "../shared/Sheet";
import Field from "../shared/Field";

const MIN_LENGTH = 6;

// Changing your own password from Me. Asks for the current one first — see
// changePassword in AuthContext for why that isn't optional here.
//
// This is not account recovery. It only works for someone who still knows
// their password; a student who has forgotten it has no way back in at all
// (PRD §14.3), and that remains the larger gap.
export default function PasswordSheet() {
  const { t } = useI18n();
  const { changePassword } = useAuth();
  const { closeSheet, showToast } = useUI();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorKey, setErrorKey] = useState(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    // Checked here so the obvious mistakes don't cost a round trip.
    if (!current || !next) { setErrorKey("pwAllFields"); return; }
    if (next.length < MIN_LENGTH) { setErrorKey("pwTooShort"); return; }
    if (next !== confirm) { setErrorKey("authPasswordMismatch"); return; }
    if (next === current) { setErrorKey("pwSame"); return; }

    setSaving(true);
    const result = await changePassword(current, next);
    setSaving(false);
    if (result.ok) { showToast(t("pwChanged")); closeSheet(); return; }
    setErrorKey(result.reason === "wrong" ? "pwWrong" : "pwError");
  }

  function edit(setter) {
    return (e) => { setter(e.target.value); setErrorKey(null); };
  }

  return (
    <Sheet onClose={closeSheet}>
      <h2>{t("pwTitle")}</h2>
      <p className="sub">{t("pwSub")}</p>

      <Field label={t("pwCurrent")}>
        <input
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={edit(setCurrent)}
        />
      </Field>

      <Field label={t("pwNew")}>
        <input
          type="password"
          autoComplete="new-password"
          minLength={MIN_LENGTH}
          placeholder={t("authPasswordPh")}
          value={next}
          onChange={edit(setNext)}
        />
      </Field>

      <Field label={t("pwConfirm")}>
        <input
          type="password"
          autoComplete="new-password"
          minLength={MIN_LENGTH}
          value={confirm}
          onChange={edit(setConfirm)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); }}
        />
        {errorKey && <span className="field-error">{t(errorKey)}</span>}
      </Field>

      <div className="safe-note">
        <span aria-hidden="true">🔑</span>
        <span>{t("pwWarning")}</span>
      </div>

      <button className="btn" disabled={saving} onClick={save}>{t("save")}</button>
      <button className="btn2" onClick={closeSheet}>{t("cancel")}</button>
    </Sheet>
  );
}
