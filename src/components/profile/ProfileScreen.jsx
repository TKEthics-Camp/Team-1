import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useAuth } from "../../store/AuthContext";
import { useUI } from "../../ui/UIContext";
import { THEMES, DEFAULT_THEME, DECORATIONS } from "../../lib/constants";
import { globalStreak } from "../../lib/derived";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import Stats from "../shared/Stats";
import PersonAvatar from "../shared/PersonAvatar";
import { deleteMyAccount } from "../../lib/remote";

export default function ProfileScreen() {
  const { t, lang, nOf } = useI18n();
  const { profile, interests, photos, entries, clearGarden, updateProfile, setDiscoverable } = useStore();
  const { signOut } = useAuth();
  const { openSheet, showToast } = useUI();
  const navigate = useNavigate();
  const isOrg = profile && profile.accountType === "org";
  const [armed, setArmed] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const currentTheme = (profile && profile.theme) || DEFAULT_THEME;
  const [, bumpPermissionCheck] = useState(0);
  const coins = (profile && profile.coins) || 0;
  const equippedDecoration = DECORATIONS.find((d) => d.id === (profile && profile.equippedDecoration)) || null;
  const discoverable = !!(profile && profile.discoverable);
  const soundOn = !(profile && profile.soundOn === false);
  const publicCount = entries.filter((e) => e.visibility === "public").length
    + photos.filter((p) => p.visibility === "public").length;

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

  async function handleClear() {
    if (!armed) { setArmed(true); return; }
    setClearing(true);
    const { ok } = await clearGarden();
    setClearing(false);
    setArmed(false);
    // Local is already empty either way. Saying so matters when the server
    // half failed, because that's the case where it all comes back later.
    showToast(ok ? t("clearedToast") : t("clearedLocalOnly"));
  }

  // Two taps, same as clearing — but this one can't be undone by anything,
  // so it says so before the second tap rather than after.
  async function handleDeleteAccount() {
    if (!deleteArmed) { setDeleteArmed(true); return; }
    setDeleting(true);
    const ok = await deleteMyAccount();
    if (!ok) { setDeleting(false); setDeleteArmed(false); showToast(t("deleteAccountFailed")); return; }
    // Signing out is all that's left: App.jsx wipes the local cache the
    // moment `user` goes null. Calling clearGarden here would try to delete
    // server rows for an account that no longer exists — and the server side
    // of this is already done, buckets included.
    await signOut();
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
            <PersonAvatar avatar={profile.avatar} decoration={equippedDecoration} size={76} />
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
          {!isOrg && (
            <div className="coin-row">
              <span className="chip coin-pill">{"🪙 " + coins}</span>
              <button className="chip" onClick={() => navigate("/market")}>{t("market")}</button>
            </div>
          )}
        </div>

        {!isOrg && (
          <>
            <Stats items={[
              { n: globalStreak(entries, photos), k: t("totalStreak"), flame: true },
              { n: interests.length, k: nOf(interests.length, "orbsCount") },
              { n: photos.length, k: nOf(photos.length, "photos") },
              { n: entries.length, k: nOf(entries.length, "entries") },
            ]} />
            <div className="sub">{publicCount + " " + nOf(publicCount, "publicCount")}</div>
          </>
        )}

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

        {!isOrg && (
          <>
            <button className="btn2" disabled={granted || blocked} onClick={requestReminders}>
              {granted ? "✓ " + t("remindersOn") : blocked ? t("remindersBlocked") : t("turnOn")}
            </button>
          </>
        )}

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
        <div className="sub">{t(isOrg ? "discoverableNoteOrg" : "discoverableNote")}</div>

        {!isOrg && (
          profile.classCode ? (
            <div className="sub">{t("joinedClass")}</div>
          ) : (
            <>
              <button className="btn2" onClick={() => openSheet("joinClass")}>{t("joinClass")}</button>
              <div className="sub">{t("joinClassNote")}</div>
            </>
          )
        )}

        {!isOrg && (
          <>
            <button className="btn2" onClick={() => openSheet("badges")}>{t("badges")}</button>
            <button className="btn2" onClick={() => openSheet("yearReview")}>{t("yearReview")}</button>
            <button className="btn2" onClick={() => openSheet("memories")}>{t("memories")}</button>
            <button className="btn2" onClick={() => openSheet("watching")}>{t("watchingTitle")}</button>
            <button className="btn2" onClick={() => openSheet("trash")}>{t("recentlyDeleted")}</button>
          </>
        )}

        <div className="grow" />

        {!isOrg && (
          <>
            <div className="sub">{t("dataNote")}</div>

            {/* The armed state used to be a label change and nothing else,
                which is easy to tap straight past without noticing anything
                happened at all. */}
            {armed && <div className="sub">{t("clearAllWarning")}</div>}
            <button className="btn2 btn-danger" onClick={handleClear} disabled={clearing}>
              {armed ? t("confirmClear") : t("clearAll")}
            </button>
          </>
        )}

        {deleteArmed && <div className="sub">{t("deleteAccountWarning")}</div>}
        <button className="btn2 btn-danger" onClick={handleDeleteAccount} disabled={deleting}>
          {deleteArmed ? t("deleteAccountConfirm") : t("deleteAccount")}
        </button>
        <button className="btn2" onClick={signOut}>{t("logOut")}</button>
      </div>
    </>
  );
}
