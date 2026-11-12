import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { DAY_ABBR, DAY_FULL } from "../../i18n/strings";
import { weekStrip } from "../../lib/insights";
import { fmtHours } from "../../lib/derived";
import Icon from "../shared/Icon";

// This week at a glance: seven days, the ones you showed up on filled in,
// today ringed until it is. The streak in the header is a number; this is
// the same idea as a picture, and the gap that is today is the most direct
// reason there is to log something.
//
// It is also the way into Insights, where the same days run back for months.
export default function WeekStrip({ entries, photos }) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const li = lang === "en" ? 0 : 1;
  const days = weekStrip(entries, photos);
  const shown = days.filter((d) => d.logged).length;
  const minutes = days.reduce((n, d) => n + d.minutes, 0);
  const summary = t("weekSummary").replace("{n}", shown) + (minutes > 0 ? " · " + fmtHours(minutes) : "");

  return (
    <button
      type="button"
      className="week"
      aria-label={summary + ". " + t("weekOpen")}
      onClick={() => navigate("/journal?view=insights")}
    >
      <span className="week-days" aria-hidden="true">
        {days.map((d) => (
          <span
            key={d.key}
            title={DAY_FULL[d.dow][li]}
            className={"week-day" + (d.logged ? " on" : "") + (d.isToday ? " today" : "") + (d.isFuture ? " future" : "")}
          >
            <span className="week-letter">{DAY_ABBR[d.dow][li]}</span>
            <span className="week-dot">{d.logged && <Icon name="check" size={14} />}</span>
          </span>
        ))}
      </span>
      <span className="week-sum">
        {summary}
        <Icon name="chevronRight" size={14} />
      </span>
    </button>
  );
}
