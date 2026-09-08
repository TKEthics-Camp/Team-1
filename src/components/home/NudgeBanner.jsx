import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useUI } from "../../ui/UIContext";

export default function NudgeBanner({ interests }) {
  const { t, nameOf } = useI18n();
  const { snoozeNudge } = useUI();
  const navigate = useNavigate();
  const solo = interests.length === 1 ? interests[0] : null;

  return (
    <>
      <div className="nudge">
        <span className="bell" aria-hidden="true">🔔</span>
        <div className="body">
          <div className="head">{solo ? nameOf(solo) : t("nudgeManyTitle")}</div>
          <div className="sub">{solo ? t("nudgeSolo") : t("nudgeManySub")}</div>
          {!solo && (
            <div className="chips" style={{ marginTop: 6 }}>
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
        </div>
      </div>
      <div className="row">
        {solo && (
          <button className="btn" onClick={() => navigate(`/interest/${solo.id}?tab=journal`)}>{t("goDoIt")}</button>
        )}
        <button
          className="btn2"
          style={{ width: "auto", whiteSpace: "nowrap" }}
          onClick={() => interests.forEach((it) => snoozeNudge(it.id))}
        >
          {t("later")}
        </button>
      </div>
    </>
  );
}
