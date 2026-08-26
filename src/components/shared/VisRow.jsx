import { useI18n } from "../../i18n/I18nContext";

// Private / Public choice, shared by journal entries and photos — what it
// actually does differs by caller. A journal entry's flag really is synced
// and enforced server-side (see entries_select in the migrations): once an
// account is discoverable, its public entries are visible to others. A
// photo's flag currently isn't — photos never leave this device yet, so
// the choice is only ever stored locally, not enforced anywhere remote.
export default function VisRow({ value, onChange }) {
  const { t } = useI18n();
  const options = [
    ["private", "🔒 " + t("visPrivate")],
    ["public", "🌐 " + t("visPublic")],
  ];
  return (
    <div className="field">
      <span className="label">{t("visLabel")}</span>
      <div className="seg">
        {options.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={value === key ? "true" : "false"}
            onClick={() => onChange(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <span className="sub">{t("visNote")}</span>
    </div>
  );
}
