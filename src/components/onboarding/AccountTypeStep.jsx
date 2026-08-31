import { useI18n } from "../../i18n/I18nContext";
import SfHead from "./SfHead";

// First real question of onboarding. Individuals get a personal garden (no
// school web); schools/groups get the classmate web (no idea browser).
export default function AccountTypeStep({ value, setType, onNext }) {
  const { t } = useI18n();

  const options = [
    ["individual", t("sfJustMe")],
    ["org", t("sfSchoolOrg")],
  ];

  return (
    <>
      <SfHead action="wave">{t("sfWhoTitle")}</SfHead>

      <div className="sf-options">
        {options.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className="sf-pill"
            aria-pressed={value === key ? "true" : "false"}
            onClick={() => setType(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="sf-grow" />
      <div className="sf-foot">
        <button className="sf-btn" disabled={!value} onClick={() => value && onNext()}>
          {t("sfContinue")}
        </button>
      </div>
    </>
  );
}
