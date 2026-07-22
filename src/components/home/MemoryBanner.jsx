import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useUI } from "../../ui/UIContext";
import { useObjectURL } from "../../lib/image";
import { fmtDate } from "../../lib/dates";
import Orb from "../shared/Orb";

export default function MemoryBanner({ memory }) {
  const { t, lang, nameOf } = useI18n();
  const { openSheet } = useUI();
  const navigate = useNavigate();
  const photoUrl = useObjectURL(memory.blob);

  return (
    <>
      <button
        className="memory"
        onClick={() => navigate(`/interest/${memory.interest.id}?tab=${memory.blob ? "album" : "journal"}`)}
      >
        {memory.blob ? (
          <img src={photoUrl} alt="" />
        ) : (
          <div style={{ flex: "none" }}><Orb interest={memory.interest} size={54} /></div>
        )}
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
