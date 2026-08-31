import { useI18n } from "../../i18n/I18nContext";
import { DAILY_GOALS } from "../../lib/constants";
import Mascot from "../shared/Mascot";

// A ladder of four, picked rather than typed: the question is really "how
// serious am I about this?", and four named rungs answer that faster than a
// free-text box did. Minutes, not points — it's the unit entries already
// log, so the goal can actually be measured against real activity later.
// Individuals only; an educator sets up a class here, not a practice goal.
export default function DailyGoalStep({ value, setValue, onNext }) {
  const { t } = useI18n();

  return (
    <>
      <h2 className="sf-title-c goal-title">{t("sfGoalTitle")}</h2>

      <div className="goal-row">
        <Mascot size={116} className="goal-mascot" />
        <div className="goal-options" role="radiogroup" aria-label={t("sfGoalTitle")}>
          {DAILY_GOALS.map((g) => (
            <button
              key={g.id}
              type="button"
              className="goal-opt"
              role="radio"
              aria-checked={value === g.minutes}
              onClick={() => setValue(g.minutes)}
            >
              <span className="goal-dot" aria-hidden="true" />
              <span className="goal-nm">{t(g.key)}</span>
              <span className="goal-amt">{t("goalPerDay").replace("{n}", g.minutes)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sf-grow" />
      <div className="sf-foot">
        <button className="sf-btn" onClick={onNext}>{t("sfContinue")}</button>
      </div>
    </>
  );
}
