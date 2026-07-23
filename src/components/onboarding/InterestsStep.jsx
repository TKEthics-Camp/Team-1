import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { SUGGESTIONS } from "../../i18n/strings";
import Tree from "../shared/Tree";

export default function InterestsStep({ drafts, addDraft, removeDraft, onNext }) {
  const { t, lang, nameOf } = useI18n();
  const [value, setValue] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  function submit(name, nameZh) {
    addDraft(name !== undefined ? name : value, nameZh);
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
            <button key={label} className="chip" onClick={() => submit(s[0], s[1])}>{"+ " + label}</button>
          );
        })}
      </div>

      {drafts.length > 0 && (
        <div className="draft-wall">
          {drafts.map((d, i) => (
            <button key={d.id} className="draft" aria-label={t("del") + " " + nameOf(d)} onClick={() => removeDraft(i)}>
              <span className="x" aria-hidden="true">✕</span>
              <Tree interest={d} size={72} stage={1} health="healthy" />
              <div className="draft-nm">{nameOf(d)}</div>
            </button>
          ))}
        </div>
      )}

      <div className="grow" />
      <button className="btn" disabled={!drafts.length} onClick={() => drafts.length && onNext()}>{t("next")}</button>
    </>
  );
}
