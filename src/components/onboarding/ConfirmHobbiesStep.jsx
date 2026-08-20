import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import SfHead from "./SfHead";

// Last look at the hobby list before schedules get attached to it. Names stay
// editable and removable here. Per the Figma note, the footer button doubles
// as Add: type into the empty row and Continue becomes Add until it's used.
export default function ConfirmHobbiesStep({ drafts, updateDraft, removeDraft, addDraft, blocked, onNext }) {
  const { t } = useI18n();
  const [draftName, setDraftName] = useState("");

  const typed = draftName.trim();
  const adding = !!typed;

  function commit() {
    if (adding) {
      if (!addDraft(typed)) return; // blocked hobby — leave the text for editing
      setDraftName("");
      return;
    }
    if (drafts.length) onNext();
  }

  return (
    <>
      <SfHead>{t("sfSureTitle")}</SfHead>

      <div className="sf-scroll">
        <p className="sf-hobbies-label">{t("sfHobbiesLabel")}</p>

        <div className="sf-hobby-rows">
          {drafts.map((d, i) => (
            <div key={d.id} className="sf-hobby-row">
              <input
                className="sf-field"
                type="text"
                maxLength={24}
                value={d.name}
                aria-label={d.name}
                onChange={(e) => updateDraft(i, { name: e.target.value })}
              />
              <button
                type="button"
                className="sf-x"
                aria-label={t("del") + " " + d.name}
                onClick={() => removeDraft(i)}
              >
                ⊗
              </button>
            </div>
          ))}

          <div className="sf-hobby-row">
            <input
              className="sf-field"
              type="text"
              maxLength={24}
              placeholder={t("sfOtherPh")}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
            />
            <span className="sf-x" aria-hidden="true" />
          </div>
        </div>

        {blocked && <p className="sf-err">{t("hobbyBlocked")}</p>}
      </div>

      <div className="sf-foot">
        <button
          className="sf-btn"
          disabled={!adding && !drafts.length}
          onClick={commit}
        >
          {adding ? t("sfAdd") : t("sfContinue")}
        </button>
      </div>
    </>
  );
}
