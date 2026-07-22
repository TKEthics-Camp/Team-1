import { useI18n } from "../../i18n/I18nContext";

// Private / Public choice. Honest by construction: it only stores a flag —
// there is no server, no other user, and nothing is ever transmitted.
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
