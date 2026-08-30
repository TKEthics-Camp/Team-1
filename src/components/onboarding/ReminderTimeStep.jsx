import { useI18n } from "../../i18n/I18nContext";
import SfHead from "./SfHead";

// One reminder time for the whole garden, not per hobby — asked once, right
// after the notifications ask, so there's an actual time to notify at.
// Every hobby drafted so far starts out pointed at whichever time is picked
// here; each one stays freely re-timeable later from its own settings, same
// as the species/leaf-colour "auto-assigned but editable" pattern elsewhere.
export default function ReminderTimeStep({ value, setValue, onEnter }) {
  const { t } = useI18n();

  return (
    <>
      <SfHead>{t("sfReminderTitle")}</SfHead>

      <div className="sf-time-picker">
        <input
          type="time"
          className="sf-field sf-time-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>

      <div className="sf-grow" />
      <div className="sf-foot">
        <button className="sf-btn" onClick={onEnter}>{t("sfContinue")}</button>
      </div>
    </>
  );
}
