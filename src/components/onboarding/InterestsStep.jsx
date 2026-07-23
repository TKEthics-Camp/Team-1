import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { SUGGESTIONS } from "../../i18n/strings";
import Orb from "../shared/Orb";

export default function InterestsStep({ drafts, addDraft, removeDraft, onNext }) {
  const { t, lang } = useI18n();
  const [value, setValue] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  function submit(name) {
    addDraft(name !== undefined ? name : value);
    setValue("");
  }

  return (
    <>
      <h2>{t("whatLove")}</h2>
      <p>{t("whatLoveSub")}</p>

      <div className="row">
        <div className="grow">
          <input
            ref={inputRef}
            type="text"
            maxLength={24}
            placeholder={t("interestPh")}
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
          />
        </div>
        <button className="btn2" style={{ width: "auto" }} onClick={() => submit()}>{t("add")}</button>
      </div>

      <div className="chips">
        {SUGGESTIONS.map((s) => {
          const label = s[lang === "en" ? 0 : 1];
          return (
            <button key={label} className="chip" onClick={() => submit(label)}>{"+ " + label}</button>
          );
        })}
      </div>

      {drafts.length > 0 && (
        <div className="orbwall">
          {drafts.map((d, i) => (
            <button key={d.id} className="orb-cell" aria-label={t("del") + " " + d.name} onClick={() => removeDraft(i)}>
              <Orb interest={d} size={58} />
              <div className="orb-name">{d.name}</div>
              <div className="orb-meta">{t("del")}</div>
            </button>
          ))}
        </div>
      )}

      <div className="grow" />
      <button className="btn" disabled={!drafts.length} onClick={() => drafts.length && onNext()}>{t("next")}</button>
    </>
  );
}
