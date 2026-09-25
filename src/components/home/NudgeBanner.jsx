import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useUI } from "../../ui/UIContext";

export default function NudgeBanner({ interests }) {
  const { t, nameOf } = useI18n();
  const { snoozeNudge } = useUI();
  const navigate = useNavigate();
  const solo = interests.length === 1 ? interests[0] : null;

  return (
    <div className="nudge">
      {/* An outline bell rather than the emoji: the rest of the interface
          is drawn in one line weight, and a full-colour bell was the only
          thing on the card shouting. */}
      <svg className="bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
           strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" />
        <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
      </svg>
      <div className="body">
        <div className="head">{solo ? nameOf(solo) : t("nudgeManyTitle")}</div>
        <div className="sub">{solo ? t("nudgeSolo") : t("nudgeManySub")}</div>
        {!solo && (
          <div className="chips" style={{ marginTop: 8 }}>
            {interests.map((it) => (
              <button
                key={it.id}
                type="button"
                className="chip"
                onClick={() => navigate(`/interest/${it.id}?tab=journal`)}
              >
                {nameOf(it)}
              </button>
            ))}
          </div>
        )}
        {/* Inside the card, not below it: "Later" belongs to this reminder,
            and sitting outside it read as a stray button on the page. */}
        <div className="nudge-actions">
          {solo && (
            <button className="btn" onClick={() => navigate(`/interest/${solo.id}?tab=journal`)}>{t("goDoIt")}</button>
          )}
          <button
            className="btn2"
            onClick={() => interests.forEach((it) => snoozeNudge(it.id))}
          >
            {t("later")}
          </button>
        </div>
      </div>
    </div>
  );
}
