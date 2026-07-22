import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { PALETTE } from "../../lib/constants";
import { globalStreak } from "../../lib/derived";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import Stats from "../shared/Stats";
import Orb from "../shared/Orb";

export default function ProfileScreen() {
  const { t, nOf } = useI18n();
  const { profile, interests, photos, entries, clearAllData } = useStore();
  const [armed, setArmed] = useState(false);
  const [, bumpPermissionCheck] = useState(0);

  const granted = window.Notification && Notification.permission === "granted";

  function requestReminders() {
    if (window.Notification) {
      Notification.requestPermission().then(() => bumpPermissionCheck((n) => n + 1));
    }
  }

  function handleClear() {
    if (!armed) { setArmed(true); return; }
    clearAllData();
  }

  return (
    <>
      <TopBar>
        <h1>{t("profile")}</h1>
        <LangToggle />
      </TopBar>
      <div className="view">
        <div className="center">
          <div className="orb-wrap" style={{ display: "inline-block" }}>
            <Orb interest={{ color: PALETTE[0] }} size={76} />
          </div>
          <div style={{ fontFamily: "var(--display)", fontSize: 19, fontWeight: 600, marginTop: 10 }}>
            {profile.name}
          </div>
        </div>

        <Stats items={[
          { n: globalStreak(entries), k: t("totalStreak"), flame: true },
          { n: interests.length, k: nOf(interests.length, "orbsCount") },
          { n: photos.length, k: nOf(photos.length, "photos") },
          { n: entries.length, k: nOf(entries.length, "entries") },
        ]} />

        <button className="btn2" disabled={granted} onClick={requestReminders}>
          {granted ? "✓ " + t("remindersOn") : t("turnOn")}
        </button>
        <div className="sub">{t("remindNote")}</div>

        <div className="grow" />
        <div className="sub">{t("dataNote")}</div>

        <button className="btn2 btn-danger" onClick={handleClear}>
          {armed ? t("confirmClear") : t("clearAll")}
        </button>
      </div>
    </>
  );
}
