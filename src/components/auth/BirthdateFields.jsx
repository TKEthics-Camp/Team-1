import { useI18n } from "../../i18n/I18nContext";

// The birthday and optional class code, shared by signup and by the screen
// an account sees if signup ended before its age was recorded
// (AgeRequiredScreen).
//
// Three dropdowns rather than <input type="date">. A native date picker
// opens on today, so a twelve-year-old pages back through a hundred and
// fifty months to reach their own birth year, and it renders in the
// browser's locale order — mm/dd/yyyy for a Chinese reader who expects
// year first. Year/month/day reads correctly in both languages and puts
// the birth year one tap away.
export default function BirthdateFields({ bdY, setBdY, bdM, setBdM, bdD, setBdD, classCode, setClassCode, disabled = false }) {
  const { t } = useI18n();
  const thisYear = new Date().getFullYear();
  // Most recent first: almost everyone signing up is a child, so their
  // year is at the top of the list rather than ninety scrolls down.
  const years = Array.from({ length: 100 }, (_, i) => thisYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  // Real length of the chosen month, so 31 February is never offered.
  const daysInMonth = (bdY && bdM)
    ? new Date(Number(bdY), Number(bdM), 0).getDate()
    : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="sf-stack">
      {/* No label above these: the heading already asks the
          question, and repeating it as "Date of birth" was just
          another line between the question and the answer. */}
      <div className="sf-date">
        <select
          className="sf-field"
          aria-label={t("agYear")}
          disabled={disabled}
          value={bdY}
          onChange={(e) => setBdY(e.target.value)}
        >
          <option value="">{t("agYear")}</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          className="sf-field"
          aria-label={t("agMonth")}
          disabled={disabled}
          value={bdM}
          onChange={(e) => setBdM(e.target.value)}
        >
          <option value="">{t("agMonth")}</option>
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          className="sf-field"
          aria-label={t("agDay")}
          disabled={disabled}
          value={bdD}
          onChange={(e) => setBdD(e.target.value)}
        >
          <option value="">{t("agDay")}</option>
          {days.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="sf-optional">
        <label className="sf-label" htmlFor="ag-cc">{t("agClassLabel")}</label>
        <input
          id="ag-cc"
          className="sf-field"
          type="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck="false"
          disabled={disabled}
          value={classCode}
          onChange={(e) => setClassCode(e.target.value)}
        />
        <p className="sf-hint">{t("agClassHint")}</p>
      </div>
    </div>
  );
}

// What the server wants, assembled from the three dropdowns. Zero-padded
// because the column is a date and "2015-4-9" is not one.
export function joinBirthdate(bdY, bdM, bdD) {
  return bdY && bdM && bdD
    ? `${bdY}-${String(bdM).padStart(2, "0")}-${String(bdD).padStart(2, "0")}`
    : "";
}
