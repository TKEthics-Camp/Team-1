import { useI18n } from "../../i18n/I18nContext";
import sprig from "../../assets/sprig.png";

export default function WelcomeStep({ onBegin }) {
  const { t } = useI18n();
  return (
    <>
      <div className="sf-center">
        <h2 className="sf-wordmark">{t("appName")}</h2>
        <img className="sf-hero" src={sprig} alt="" />
        <p className="sf-tagline">{t("sfTagline")}</p>
      </div>
      <div className="sf-foot">
        <button className="sf-btn" onClick={onBegin}>{t("sfStart")}</button>
      </div>
    </>
  );
}
