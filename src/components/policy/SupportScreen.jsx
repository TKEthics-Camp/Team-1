import { useI18n } from "../../i18n/I18nContext";
import { SUPPORT } from "../../lib/supportText";
import { SUPPORT_EMAIL, SUPPORT_REPLY_DAYS } from "../../lib/support";
import LangToggle from "../shared/LangToggle";

// The Help page. Public, like the policies, because the App Store Support
// URL points here and whoever opens it — a parent, Apple's reviewer — has no
// account. Doubles as the in-app help screen.
export default function SupportScreen({ onBack }) {
  const { lang } = useI18n();
  const i = lang === "en" ? 0 : 1;
  const base = import.meta.env.BASE_URL || "/";

  return (
    <div className="sf-screen">
      <div className="sf-inner consent-page">
        <div className="sf-top">
          {onBack ? (
            <button className="sf-back" type="button" onClick={onBack} aria-label="Back">‹</button>
          ) : <span />}
          <LangToggle />
        </div>

        <h1 className="consent-h">{SUPPORT.title[i]}</h1>

        {/* Contact first: it is the one thing this page must never bury. */}
        <div className="consent-block consent-promise">
          <h2 className="consent-h2">{lang === "en" ? "Contact us" : "联系我们"}</h2>
          {SUPPORT_EMAIL ? (
            <>
              <p className="consent-fine" style={{ marginTop: 0 }}>
                <a href={"mailto:" + SUPPORT_EMAIL}>{SUPPORT_EMAIL}</a>
              </p>
              <p className="consent-fine">
                {lang === "en"
                  ? `A person reads every message and replies within ${SUPPORT_REPLY_DAYS} days.`
                  : `每条消息都有专人阅读，并会在 ${SUPPORT_REPLY_DAYS} 天内回复。`}
              </p>
            </>
          ) : (
            <p className="consent-fine" style={{ marginTop: 0 }}>
              {lang === "en"
                ? "Ask the teacher or adult who gave you Forest."
                : "请联系把 Forest 介绍给你的老师或成年人。"}
            </p>
          )}
        </div>

        {SUPPORT.sections.map((section, s) => (
          <div className="consent-block" key={s}>
            <h2 className="consent-h2">{section.h[i]}</h2>
            <ul className="consent-list">
              {section.p.map((line, l) => <li key={l}>{line[i]}</li>)}
            </ul>
          </div>
        ))}

        <p className="consent-fine">
          <a href={base + "privacy"}>{lang === "en" ? "Privacy Policy" : "隐私政策"}</a>
          {"  ·  "}
          <a href={base + "terms"}>{lang === "en" ? "Terms of Use" : "使用条款"}</a>
        </p>
      </div>
    </div>
  );
}
