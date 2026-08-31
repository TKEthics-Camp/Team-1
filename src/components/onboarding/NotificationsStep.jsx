import { useI18n } from "../../i18n/I18nContext";
import { askNotifications } from "../../lib/useReminderTimers";
import Mascot from "../shared/Mascot";

// Last stop before the garden. Asks explicitly, with its own screen, instead
// of firing the bare browser permission popup unannounced — a cold OS prompt
// with no context is far more likely to get reflexively denied, and denial
// can't be undone from inside the app (only from browser/OS settings), so
// this is the one shot worth spending an explanation on. "Not Now" just
// moves on without ever calling Notification.requestPermission() — asking
// again later (e.g. from Me) still finds permission at its untouched
// "default" state.
export default function NotificationsStep({ onEnter }) {
  const { t } = useI18n();

  function allow() {
    askNotifications();
    onEnter();
  }

  return (
    <>
      <div className="sf-center">
        <h2 className="sf-title-c">{t("sfNotifTitle")}</h2>
        <Mascot size={132} className="sf-hero" action="point" />
        <p className="sf-tagline">{t("sfNotifBody")}</p>
      </div>
      <div className="sf-foot sf-notif-foot">
        <button className="sf-btn" onClick={allow}>{t("sfAllowNotifications")}</button>
        <button type="button" className="sf-linkbtn" onClick={onEnter}>{t("sfNotNow")}</button>
      </div>
    </>
  );
}
