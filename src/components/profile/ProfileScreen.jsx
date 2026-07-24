import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useAuth } from "../../store/AuthContext";
import { useUI } from "../../ui/UIContext";
import { PALETTE, THEMES, DEFAULT_THEME, DECORATIONS } from "../../lib/constants";
import { globalStreak } from "../../lib/derived";
import { demoGardenSeed } from "../../lib/demoGarden";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import Stats from "../shared/Stats";
import PersonAvatar from "../shared/PersonAvatar";

export default function ProfileScreen() {
  const { t, lang, nOf } = useI18n();
  const { profile, interests, photos, entries, clearAllData, updateProfile, setDiscoverable, seedDemo, removeDemoGarden } = useStore();
  const { signOut } = useAuth();
  const { openSheet } = useUI();
  const navigate = useNavigate();
  const isOrg = profile && profile.accountType === "org";
  const [armed, setArmed] = useState(false);
  const currentTheme = (profile && profile.theme) || DEFAULT_THEME;
  const [, bumpPermissionCheck] = useState(0);
  const coins = (profile && profile.coins) || 0;
  const equippedDecoration = DECORATIONS.find((d) => d.id === (profile && profile.equippedDecoration)) || null;
  const discoverable = !!(profile && profile.discoverable);
  const soundOn = !(profile && profile.soundOn === false);
  const publicCount = entries.filter((e) => e.visibility === "public").length
    + photos.filter((p) => p.visibility === "public").length;
  const hasDemoGarden = interests.some((x) => x.isDemo);

  const permission = window.Notification ? Notification.permission : "unsupported";
  const granted = permission === "granted";
  const blocked = permission === "denied";

  function requestReminders() {
    // Once a browser has denied notifications, it won't show the prompt
    // again — only the user can re-allow it from the browser's own site
    // settings, so there's nothing left for this click to do.
    if (window.Notification && permission === "default") {
      Notification.requestPermission().then(() => bumpPermissionCheck((n) => n + 1));
    }
  }

  function handleClear() {
    if (!armed) { setArmed(true); return; }
    clearAllData(true);
  }

  function plantDemoGarden() {
    const { interests: seedInterests, entries: seedEntries } = demoGardenSeed();
    seedDemo(seedInterests, seedEntries);
    navigate("/");
  }

  // Photo bytes aren't included — a JSON file isn't a sane container for
  // megabytes of image data. This is a backup of everything that's actually
  // text: the profile, every tree, and every journal entry, plus each
  // photo's caption/date/visibility (just not the picture itself).
  function exportData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile, interests, entries,
      photos: photos.map(({ blob, ...meta }) => meta),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leaves-export-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
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
            aria-label={t("customizeAvatar")}
            onClick={() => openSheet("avatar")}
          >
            <PersonAvatar color={PALETTE[0]} avatar={profile.avatar} decoration={equippedDecoration} size={76} />
            <span className="avatar-edit-badge" aria-hidden="true">✎</span>
          </button>
          <button
            type="button"
            className="row"
            style={{ gap: 6, background: "none", border: "none", marginTop: 10, cursor: "pointer" }}
            aria-label={t("editUsername")}
            onClick={() => openSheet("username")}
          >
            <span style={{ fontFamily: "var(--display)", fontSize: 19, fontWeight: 600 }}>
              {profile.name}
            </span>
            <span aria-hidden="true">✎</span>
          </button>
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
        <div className="sub">{publicCount + " " + nOf(publicCount, "publicCount")}</div>

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

        <button className="btn2" disabled={granted || blocked} onClick={requestReminders}>
          {granted ? "✓ " + t("remindersOn") : blocked ? t("remindersBlocked") : t("turnOn")}
        </button>
        <div className="sub">{t("remindNote")}</div>

        <button className="btn2" onClick={() => updateProfile({ soundOn: !soundOn })}>
          {soundOn ? "🔊 " + t("soundOn") : "🔈 " + t("soundOff")}
        </button>

        <div className="label">{t("discoverableLabel")}</div>
        <div className="seg">
          <button type="button" aria-pressed={!discoverable ? "true" : "false"} onClick={() => setDiscoverable(false)}>
            {t("discoverableOff")}
          </button>
          <button type="button" aria-pressed={discoverable ? "true" : "false"} onClick={() => setDiscoverable(true)}>
            {t("discoverableOn")}
          </button>
        </div>
        <div className="sub">{t("discoverableNote")}</div>

        {isOrg ? (
          <div className="sub">{t("yourClassCode") + ": " + profile.classCode}</div>
        ) : profile.classCode ? (
          <div className="sub">{t("joinedClass")}</div>
        ) : (
          <>
            <button className="btn2" onClick={() => openSheet("joinClass")}>{t("joinClass")}</button>
            <div className="sub">{t("joinClassNote")}</div>
          </>
        )}

        <button className="btn2" onClick={() => { updateProfile({ tourSeen: false }); navigate("/"); }}>{t("replayTour")}</button>

        <button className="btn2" data-tour="yearReview" onClick={() => openSheet("yearReview")}>{t("yearReview")}</button>
        <button className="btn2" onClick={() => openSheet("memories")}>{t("memories")}</button>

        {hasDemoGarden ? (
          <button className="btn2" onClick={removeDemoGarden}>{t("removeDemoGarden")}</button>
        ) : (
          <button className="btn2" onClick={plantDemoGarden}>{t("plantDemoGarden")}</button>
        )}
        <div className="sub">{hasDemoGarden ? t("removeDemoGardenNote") : t("plantDemoGardenNote")}</div>

        <div className="grow" />

        <button className="btn2" onClick={exportData}>{t("exportData")}</button>
        <div className="sub">{t("exportDataNote")}</div>

        <div className="sub">{t("dataNote")}</div>

        <button className="btn2 btn-danger" onClick={handleClear}>
          {armed ? t("confirmClear") : t("clearAll")}
        </button>
        <button className="btn2" onClick={signOut}>{t("logOut")}</button>
      </div>
    </>
  );
}
