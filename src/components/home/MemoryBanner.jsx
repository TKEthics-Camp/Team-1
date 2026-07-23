import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useUI } from "../../ui/UIContext";
import { fmtDate } from "../../lib/dates";

export default function MemoryBanner({ memory }) {
  const { t, lang, nameOf } = useI18n();
  const { openSheet } = useUI();
  const navigate = useNavigate();

  return (
    <>
      <button
        className="memory"
        onClick={() => navigate(`/interest/${memory.interest.id}/entries?tab=${memory.blob ? "album" : "journal"}`)}
      >
        <div className="body">
          <span className="kicker">
            {memory.quietDays ? t("quietDays").replace("{n}", memory.quietDays) : t("remember")}
          </span>
          <div className="text">{memory.text || nameOf(memory.interest)}</div>
          <div className="when">
            {nameOf(memory.interest) + " · " + (memory.quietDays ? t("quietSub") : fmtDate(memory.date, lang))}
          </div>
        </div>
      </button>

      <button
        className={memory.quietDays ? "btn" : "btn2"}
        onClick={() => openSheet("entry", memory.interest.id)}
      >
        {t("pickItUp")}
      </button>
    </>
  );
}
