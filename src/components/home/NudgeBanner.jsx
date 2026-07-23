import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useUI } from "../../ui/UIContext";
import { nudgeHead, nudgeSub } from "../../lib/reminders";

export default function NudgeBanner({ interest }) {
  const { t, lang, nameOf } = useI18n();
  const { dismissNudge } = useUI();
  const navigate = useNavigate();

  return (
    <>
      <div className="nudge">
        <span className="bell" aria-hidden="true">🔔</span>
        <div className="body">
          <div className="head">{nudgeHead(interest, lang, nameOf)}</div>
          <div className="sub">{nudgeSub(interest, t)}</div>
        </div>
      </div>
      <div className="row">
        <button className="btn" onClick={() => navigate(`/interest/${interest.id}/entries?tab=journal`)}>{t("goDoIt")}</button>
        <button className="btn2" style={{ width: "auto", whiteSpace: "nowrap" }} onClick={() => dismissNudge(interest.id)}>
          {t("later")}
        </button>
      </div>
    </>
  );
}
