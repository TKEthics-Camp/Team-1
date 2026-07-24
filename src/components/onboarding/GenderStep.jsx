import { useI18n } from "../../i18n/I18nContext";

// Asked once, right after Welcome, purely to pick a sensible starting look
// for the avatar (hair style) — everything it sets is freely re-editable
// later from Me → avatar, coins and all, so nothing here is permanent.
export default function GenderStep({ value, setGender, onNext }) {
  const { t } = useI18n();

  const options = [
    ["boy", "👦", t("genderBoy")],
    ["girl", "👧", t("genderGirl")],
    ["unspecified", "🌿", t("genderSkip")],
  ];

  return (
    <>
      <h2>{t("genderTitle")}</h2>
      <p>{t("genderSub")}</p>

      <div className="acct-choices">
        {options.map(([key, emoji, label]) => (
          <button
            key={key}
            type="button"
            className="acct-card"
            aria-pressed={value === key ? "true" : "false"}
            onClick={() => setGender(key)}
          >
            <span className="acct-emoji" aria-hidden="true">{emoji}</span>
            <span className="acct-label">{label}</span>
          </button>
        ))}
      </div>

      <div className="grow" />
      <button className="btn" disabled={!value} onClick={() => value && onNext()}>{t("next")}</button>
    </>
  );
}
