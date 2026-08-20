import { useI18n } from "../../i18n/I18nContext";
import SfHead from "./SfHead";

// Asked once, purely to pick a sensible starting look for the avatar (hair
// style) — everything it sets is freely re-editable later from Me → avatar,
// coins and all, so nothing here is permanent. Individuals only.
export default function GenderStep({ value, setGender, onNext }) {
  const { t } = useI18n();

  const options = [
    ["boy", t("sfMale")],
    ["girl", t("sfFemale")],
    ["unspecified", t("sfPreferNot")],
  ];

  return (
    <>
      <SfHead>{t("sfQuickTitle")}</SfHead>

      <div className="sf-options">
        {options.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className="sf-pill"
            aria-pressed={value === key ? "true" : "false"}
            onClick={() => setGender(key)}
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
