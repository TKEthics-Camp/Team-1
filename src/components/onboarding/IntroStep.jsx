import { useI18n } from "../../i18n/I18nContext";
import sprig from "../../assets/sprig.png";

// Breather screen between signing in and the first real question, so the
// flow doesn't open on a form. Shown to individuals and orgs alike.
export default function IntroStep({ onNext }) {
  const { t } = useI18n();
  return (
    <>
      <div className="sf-center">
        <h2 className="sf-title-c">{t("sfIntroTitle")}</h2>
        <img className="sf-hero" src={sprig} alt="" />
      </div>
      <div className="sf-foot">
        <button className="sf-btn" onClick={onNext}>{t("sfContinue")}</button>
      </div>
    </>
  );
}
