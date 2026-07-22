import { useI18n } from "../../i18n/I18nContext";

// First real question of onboarding. Individuals get a personal garden (no
// school web); schools/groups get the classmate web (no idea browser).
export default function AccountTypeStep({ value, setType, onNext }) {
  const { t } = useI18n();

  const options = [
    ["individual", "🌱", t("acctSolo"), t("acctSoloNote")],
    ["org", "🏫", t("acctOrg"), t("acctOrgNote")],
  ];

  return (
    <>
      <h2>{t("acctTitle")}</h2>
      <p>{t("acctSub")}</p>

      <div className="acct-choices">
        {options.map(([key, emoji, label, note]) => (
          <button
            key={key}
            type="button"
            className="acct-card"
            aria-pressed={value === key ? "true" : "false"}
            onClick={() => setType(key)}
          >
            <span className="acct-emoji" aria-hidden="true">{emoji}</span>
            <span className="acct-label">{label}</span>
            <span className="acct-note">{note}</span>
          </button>
        ))}
      </div>

      <div className="grow" />
      <button className="btn" disabled={!value} onClick={() => value && onNext()}>{t("next")}</button>
    </>
  );
}
