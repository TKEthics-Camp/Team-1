import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { SUGGESTIONS } from "../../i18n/strings";
import SfHead from "./SfHead";

// Pick-from-a-list rather than free text: tapping a row adds or removes that
// hobby outright. "Other" reveals a field for anything not on the list — the
// typed value is committed on Continue, so it can't be lost by moving on.
export default function InterestsStep({ drafts, toggleDraft, addDraft, blocked, onNext }) {
  const { t, lang } = useI18n();
  const [other, setOther] = useState(false);
  const [otherName, setOtherName] = useState("");

  const names = drafts.map((d) => d.name);
  const typed = otherName.trim();
  const canGo = drafts.length > 0 || (other && !!typed);

  function next() {
    if (other && typed) {
      if (!addDraft(typed)) return; // blocked hobby — keep them here to fix it
      setOtherName("");
      setOther(false);
    }
    onNext();
  }

  return (
    <>
      <SfHead action="point">{t("sfHobbiesTitle")}</SfHead>

      <div className="sf-scroll">
        <div className="sf-checks">
          {SUGGESTIONS.map((s) => {
            const label = s[lang === "en" ? 0 : 1];
            const on = names.includes(label);
            return (
              <button
                key={label}
                type="button"
                className="sf-check"
                aria-pressed={on ? "true" : "false"}
                onClick={() => toggleDraft(label)}
              >
                <span className="sf-box" aria-hidden="true">{on ? "✓" : ""}</span>
                <span className="sf-check-label">{label}</span>
              </button>
            );
          })}

          <button
            type="button"
            className="sf-check"
            aria-pressed={other ? "true" : "false"}
            onClick={() => setOther((o) => !o)}
          >
            <span className="sf-box" aria-hidden="true">{other ? "✓" : ""}</span>
            <span className="sf-check-label">{t("sfOther")}</span>
          </button>
        </div>

        {other && (
          <input
            className="sf-field"
            style={{ marginTop: 14 }}
            type="text"
            maxLength={24}
            autoFocus
            placeholder={t("sfOtherPh")}
            value={otherName}
            onChange={(e) => setOtherName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && canGo) { e.preventDefault(); next(); } }}
          />
        )}

        {blocked && <p className="sf-err">{t("hobbyBlocked")}</p>}
      </div>

      <div className="sf-foot">
        <button className="sf-btn" disabled={!canGo} onClick={() => canGo && next()}>
          {t("sfContinue")}
        </button>
      </div>
    </>
  );
}
