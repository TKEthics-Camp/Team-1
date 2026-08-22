import { useI18n } from "../../i18n/I18nContext";
import Mascot from "../shared/Mascot";

export default function WelcomeStep({ onBegin }) {
  const { t } = useI18n();
  return (
    <>
      <div className="sf-center">
        <h2 className="sf-wordmark">{t("appName")}</h2>
        <Mascot size={132} className="sf-hero" />
        <p className="sf-tagline">{t("sfTagline")}</p>
      </div>
      <div className="sf-foot">
        <button className="sf-btn" onClick={onBegin}>{t("sfStart")}</button>
      </div>
    </>
  );
}
