import { DAY_ABBR, DAY_FULL } from "../../i18n/strings";
import { useI18n } from "../../i18n/I18nContext";

// Toggle which weekdays a hobby's reminder applies to. `days` is an array of
// Date#getDay() numbers (0=Sun); empty means "every day".
export default function DayPicker({ days = [], onChange }) {
  const { lang } = useI18n();

  function toggle(d) {
    onChange(days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => a - b));
  }

  return (
    <div className="day-picker">
      {DAY_ABBR.map((label, d) => (
        <button
          key={d}
          type="button"
          className="day-btn"
          aria-pressed={days.includes(d)}
          aria-label={DAY_FULL[d][lang === "en" ? 0 : 1]}
          onClick={() => toggle(d)}
        >
          {label[lang === "en" ? 0 : 1]}
        </button>
      ))}
    </div>
  );
}
