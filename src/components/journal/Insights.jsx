import { useI18n } from "../../i18n/I18nContext";
import { DAY_FULL } from "../../i18n/strings";
import { useStore } from "../../store/StoreContext";
import { summary, weeklyMinutes, heatmap, byHobby, bestWeekday } from "../../lib/insights";
import { fmtHours, fmtDuration } from "../../lib/derived";
import { keyToDate } from "../../lib/dates";
import EmptyState from "../shared/EmptyState";
import Icon, { hobbyLook } from "../shared/Icon";

const WEEKS_OF_BARS = 8;
const WEEKS_OF_GRID = 15;

// What the logging adds up to. Four numbers, the last eight weeks as bars,
// fifteen weeks of days as a grid, and where the time went by hobby.
//
// Everything is the student's own record against itself — this week beside
// last week, not beside anybody else. There is no ranking here and nothing
// to compare with a classmate (PRD §9.1).
export default function Insights() {
  const { t, lang, nameOf } = useI18n();
  const { interests, entries, photos } = useStore();
  const li = lang === "en" ? 0 : 1;
  const locale = lang === "zh" ? "zh-CN" : "en-GB";

  const s = summary(entries, photos);
  if (!s.activeDays) return <EmptyState text={t("insEmpty")} />;

  const weeks = weeklyMinutes(entries, new Date(), WEEKS_OF_BARS);
  const tallest = Math.max(1, ...weeks.map((w) => w.minutes));
  const grid = heatmap(entries, photos, new Date(), WEEKS_OF_GRID);
  const hobbies = byHobby(interests, entries, photos);
  const most = Math.max(1, ...hobbies.map((h) => h.minutes));
  const best = bestWeekday(entries, photos);

  const diff = s.weekMinutes - s.lastWeekMinutes;
  const versus = diff > 0 ? t("insMore").replace("{d}", fmtDuration(diff))
    : diff < 0 ? t("insLess").replace("{d}", fmtDuration(-diff))
    : s.weekMinutes > 0 ? t("insSame") : "";

  const shortDate = (key) => keyToDate(key).toLocaleDateString(locale, { day: "numeric", month: "short" });

  return (
    <>
      <div className="me-stats">
        {[
          [s.streak, t("totalStreak")],
          [s.bestRun, t("insBest")],
          [fmtHours(s.weekMinutes), t("insThisWeek")],
          [fmtHours(s.totalMinutes), t("insTotal")],
        ].map(([n, k]) => (
          <div className="me-stat" key={k}>
            <span className="n">{n}</span>
            <span className="k">{k}</span>
          </div>
        ))}
      </div>

      <section className="ins-card">
        <div className="ins-head">
          <h2>{t("insWeeks")}</h2>
          {versus && <span className="ins-note">{versus}</span>}
        </div>
        <div className="ins-bars" role="img" aria-label={t("insWeeks")}>
          {weeks.map((w, i) => (
            <span
              key={w.start}
              className={"ins-bar" + (i === weeks.length - 1 ? " now" : "")}
              title={shortDate(w.start) + " · " + fmtDuration(w.minutes)}
              style={{ "--h": Math.max(4, Math.round((w.minutes / tallest) * 100)) + "%" }}
            />
          ))}
        </div>
        <div className="ins-axis">
          <span>{shortDate(weeks[0].start)}</span>
          <span>{t("insThisWeek")}</span>
        </div>
      </section>

      <section className="ins-card">
        <div className="ins-head">
          <h2>{t("insActivity")}</h2>
          <span className="ins-note">{t("insActiveDays").replace("{n}", s.activeDays)}</span>
        </div>
        {/* A month's name sits over the first week that starts in it. */}
        <div className="heat-months" aria-hidden="true">
          {grid.map((col, i) => (
            <span key={col[0].key}>
              {i === 0 || col[0].month !== grid[i - 1][0].month
                ? keyToDate(col[0].key).toLocaleDateString(locale, { month: "short" })
                : ""}
            </span>
          ))}
        </div>
        <div className="heat" role="img" aria-label={t("insActiveDays").replace("{n}", s.activeDays)}>
          {grid.flat().map((d) => (
            <i
              key={d.key}
              className={"heat-day" + (d.level < 0 ? " ahead" : " l" + d.level)}
              title={d.level < 0 ? undefined : shortDate(d.key) + (d.logs ? " · " + (d.minutes ? fmtDuration(d.minutes) : t("justLogged")) : "")}
            />
          ))}
        </div>
        <div className="heat-foot">
          {best !== null && (
            <span className="ins-fact">{t("insBestDay").replace("{day}", DAY_FULL[best][li])}</span>
          )}
          <span className="heat-legend" aria-hidden="true">
            {t("insLegendLess")}
            <i className="heat-day l0" /><i className="heat-day l1" /><i className="heat-day l2" /><i className="heat-day l3" />
            {t("insLegendMore")}
          </span>
        </div>
      </section>

      <section className="ins-card">
        <div className="ins-head">
          <h2>{t("insByHobby")}</h2>
        </div>
        <div className="ins-hobbies">
          {hobbies.map(({ interest, minutes, logs }) => {
            const look = hobbyLook(interest.name);
            return (
              <div className="ins-hobby" key={interest.id}>
                <span className={"idea-ico stat-ico tag-" + look.tone} aria-hidden="true">
                  <Icon name={look.icon} size={17} />
                </span>
                <div className="ins-hobby-body">
                  <div className="ins-hobby-row">
                    <span className="ins-hobby-name">{nameOf(interest)}</span>
                    <span className="ins-hobby-n">
                      {minutes > 0 ? fmtHours(minutes) : t("logsAll").replace("{a}", logs)}
                    </span>
                  </div>
                  <div className="bar"><span style={{ width: Math.round((minutes / most) * 100) + "%" }} /></div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
