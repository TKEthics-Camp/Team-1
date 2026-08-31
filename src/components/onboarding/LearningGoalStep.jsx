import { useI18n } from "../../i18n/I18nContext";
import SfHead from "./SfHead";

// Asked once the hobbies are settled, so "get better at what?" already has
// an answer behind it. Deliberately optional — onboarding shouldn't gate the
// garden behind a text box — so the button reads Skip until something's
// typed, and an empty answer is stored as "" rather than a placeholder.
// Individuals only: an educator sets up a class here, not a practice goal.
export default function LearningGoalStep({ value, setValue, onNext }) {
  const { t } = useI18n();
  const filled = value.trim().length > 0;

  return (
    <>
      <SfHead>{t("sfGoalTitle")}</SfHead>

      <div className="sf-stack">
        <div>
          <label className="sf-label" htmlFor="sf-goal">{t("sfGoalLabel")}</label>
          <input
            id="sf-goal"
            className="sf-field"
            type="text"
            maxLength={80}
            placeholder={t("sfGoalPh")}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <p className="sf-muted">{t("sfGoalNote")}</p>
      </div>

      <div className="sf-grow" />
      <div className="sf-foot">
        <button className="sf-btn" onClick={onNext}>
          {filled ? t("sfContinue") : t("sfSkip")}
        </button>
      </div>
    </>
  );
}
