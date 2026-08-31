import { useI18n } from "../../i18n/I18nContext";
import { DAY_ABBR, DAY_FULL } from "../../i18n/strings";
import SfHead from "./SfHead";

// Days only. The Figma trims this step down to a weekday row per hobby —
// reminder time keeps the default set when the draft was created, and is
// editable later from the hobby's own settings.
export default function ScheduleStep({ drafts, updateDraft, onEnter }) {
  const { t, lang } = useI18n();

  function toggle(i, days, d) {
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => a - b);
    updateDraft(i, { days: next });
  }

  return (
    <>
      <SfHead action="point">{t("sfWhenTitle")}</SfHead>

      <div className="sf-scroll">
        {drafts.map((d, i) => {
          const days = d.days || [];
          return (
            <div key={d.id} className="sf-sched-group">
              <p className="sf-hobby-name">{d.name}</p>
              <div className="sf-days">
                {DAY_ABBR.map((label, dayNum) => (
                  <button
                    key={dayNum}
                    type="button"
                    className="sf-day"
                    aria-pressed={days.includes(dayNum) ? "true" : "false"}
                    aria-label={d.name + " — " + DAY_FULL[dayNum][lang === "en" ? 0 : 1]}
                    onClick={() => toggle(i, days, dayNum)}
                  >
                    {label[lang === "en" ? 0 : 1]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sf-foot">
        <button className="sf-btn" onClick={onEnter}>{t("sfContinue")}</button>
      </div>
    </>
  );
}
