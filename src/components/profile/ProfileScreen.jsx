import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useAuth } from "../../store/AuthContext";
import { PALETTE, THEMES, DEFAULT_THEME, DECORATIONS } from "../../lib/constants";
import { globalStreak } from "../../lib/derived";
import { downscale } from "../../lib/image";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import Stats from "../shared/Stats";
import Orb from "../shared/Orb";

export default function ProfileScreen() {
  const { t, lang, nOf } = useI18n();
  const { profile, interests, photos, entries, clearAllData, updateProfile } = useStore();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [armed, setArmed] = useState(false);
  const currentTheme = (profile && profile.theme) || DEFAULT_THEME;
  const [, bumpPermissionCheck] = useState(0);
  const avatarFileRef = useRef(null);
  const coins = (profile && profile.coins) || 0;
  const equippedDecoration = DECORATIONS.find((d) => d.id === (profile && profile.equippedDecoration)) || null;

  const granted = window.Notification && Notification.permission === "granted";

  function requestReminders() {
    if (window.Notification) {
      Notification.requestPermission().then(() => bumpPermissionCheck((n) => n + 1));
    }
  }

  function onAvatarChange(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    downscale(f, 400, (blob) => updateProfile({ avatar: blob }));
  }

  function handleClear() {
    if (!armed) { setArmed(true); return; }
    clearAllData(true);
  }

  return (
    <>
      <TopBar>
        <h1>{t("profile")}</h1>
        <LangToggle />
      </TopBar>
      <div className="view">
        <div className="center">
          <button
            type="button"
            className="avatar-btn"
            aria-label={t("changePhoto")}
            onClick={() => avatarFileRef.current?.click()}
          >
            <div className="orb-wrap" style={{ display: "inline-block" }}>
              <Orb interest={{ color: PALETTE[0] }} faceBlob={profile.avatar} decoration={equippedDecoration} size={76} />
            </div>
            <span className="avatar-edit-badge" aria-hidden="true">✎</span>
          </button>
          <input
            ref={avatarFileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={onAvatarChange}
          />
          <div style={{ fontFamily: "var(--display)", fontSize: 19, fontWeight: 600, marginTop: 10 }}>
            {profile.name}
          </div>
          <div className="coin-row">
            <span className="chip coin-pill">{"🪙 " + coins}</span>
            <button className="chip" onClick={() => navigate("/market")}>{t("market")}</button>
          </div>
        </div>

        <Stats items={[
          { n: globalStreak(entries, photos), k: t("totalStreak"), flame: true },
          { n: interests.length, k: nOf(interests.length, "orbsCount") },
          { n: photos.length, k: nOf(photos.length, "photos") },
          { n: entries.length, k: nOf(entries.length, "entries") },
        ]} />

        <div className="label">{t("theme")}</div>
        <div className="themes">
          {THEMES.map((th) => (
            <button
              key={th.id}
              className="theme-btn"
              aria-pressed={th.id === currentTheme ? "true" : "false"}
              onClick={() => updateProfile({ theme: th.id })}
            >
              <div className="band">
                {th.sw.map((c, i) => <span key={i} style={{ background: c }} />)}
              </div>
              <div className="nm">{th.name[lang === "en" ? 0 : 1]}</div>
            </button>
          ))}
        </div>
        <div className="sub">{t("themeNote")}</div>

        <button className="btn2" disabled={granted} onClick={requestReminders}>
          {granted ? "✓ " + t("remindersOn") : t("turnOn")}
        </button>
        <div className="sub">{t("remindNote")}</div>

        <div className="grow" />
        <div className="sub">{t("dataNote")}</div>

        <button className="btn2 btn-danger" onClick={handleClear}>
          {armed ? t("confirmClear") : t("clearAll")}
        </button>
        <button className="btn2" onClick={signOut}>{t("logOut")}</button>
      </div>
    </>
  );
}
