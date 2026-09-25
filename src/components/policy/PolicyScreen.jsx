import { useI18n } from "../../i18n/I18nContext";
import { PRIVACY, TERMS } from "../../lib/policyText";
import { TERMS_VERSION, PRIVACY_VERSION } from "../../lib/policyVersions";
import LangToggle from "../shared/LangToggle";

// Renders whichever policy was asked for, in whichever language is on.
//
// Reachable without a session, because the guardian consent page links here
// and a parent following that link has no account and never will. That is
// also why it does not use TopBar: it has to stand on its own.
export default function PolicyScreen({ which = "privacy", onBack }) {
  const { lang } = useI18n();
  const i = lang === "en" ? 0 : 1;
  const doc = which === "terms" ? TERMS : PRIVACY;
  const version = which === "terms" ? TERMS_VERSION : PRIVACY_VERSION;

  return (
    <div className="sf-screen">
      <div className="sf-inner consent-page">
        <div className="sf-top">
          {onBack ? (
            <button className="sf-back" type="button" onClick={onBack} aria-label="Back">‹</button>
          ) : <span />}
          <LangToggle />
        </div>

        <h1 className="consent-h">{doc.title[i]}</h1>

        {doc.sections.map((section, s) => (
          <div className="consent-block" key={s}>
            <h2 className="consent-h2">{section.h[i]}</h2>
            <ul className="consent-list">
              {section.p.map((line, l) => <li key={l}>{line[i]}</li>)}
            </ul>
          </div>
        ))}

        <p className="consent-fine">
          {lang === "en" ? "Version" : "版本"} {version}
        </p>
        <p className="consent-fine">
          {lang === "en"
            ? "This is a draft and has not yet been reviewed by a lawyer."
            : "这是一份草稿，尚未经过律师审阅。"}
        </p>
      </div>
    </div>
  );
}
