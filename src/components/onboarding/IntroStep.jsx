import { useI18n } from "../../i18n/I18nContext";
import Mascot from "../shared/Mascot";

// Breather screen between signing in and the first real question, so the
// flow doesn't open on a form. Shown to individuals and orgs alike.
export default function IntroStep({ onNext }) {
  const { t } = useI18n();
  return (
    <>
      <div className="sf-center">
        <h2 className="sf-title-c">{t("sfIntroTitle")}</h2>
        <Mascot size={132} className="sf-hero" action="wave" />
      </div>
      <div className="sf-foot">
        <button className="sf-btn" onClick={onNext}>{t("sfContinue")}</button>
      </div>
    </>
  );
}
