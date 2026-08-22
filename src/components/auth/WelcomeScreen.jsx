import { useI18n } from "../../i18n/I18nContext";
import Mascot from "../shared/Mascot";

// The very first thing a signed-out visitor sees, ahead of the sign up/log
// in form itself — see App.jsx, which only renders this until the user
// picks a direction (Start vs "Already have an account?").
export default function WelcomeScreen({ onStart, onLogIn }) {
  const { t } = useI18n();

  return (
    <div className="welcome">
      <h1 className="welcome-title">{t("appName")}</h1>
      <Mascot size={140} className="welcome-mascot" />
      <p className="welcome-tagline">{t("welcomeTagline")}</p>
      <button type="button" className="welcome-have-account" onClick={onLogIn}>
        {t("welcomeHaveAccount")}
      </button>
      <button type="button" className="welcome-start-btn" onClick={onStart}>
        {t("welcomeStart")}
      </button>
    </div>
  );
}
