import { useEffect, useState } from "react";
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
import { buildExport } from "../../lib/exportData";
import { saveFile } from "../../lib/saveFile";
import { useConsentStatus } from "../../lib/useConsentStatus";
import { amIModerator } from "../../lib/remote";
import { useNotificationPermission, requestNotificationPermission, isNative } from "../../lib/notifications";
import Icon from "../shared/Icon";

// One row of a grouped list: an icon, the label, and a chevron (or
// whatever `trailing` says; null for actions that do not open anything).
// The grouped list is the reference's way of holding many settings without
// a wall of buttons.
function ListRow({ icon, children, onClick, disabled = false, danger = false, trailing }) {
  return (
    <button type="button" className={"list-row" + (danger ? " danger" : "")} onClick={onClick} disabled={disabled}>
      <Icon name={icon} size={18} className="list-ico" />
      <span className="list-label">{children}</span>
      {trailing === undefined ? <Icon name="chevronRight" size={16} className="list-chev" /> : trailing}
    </button>
  );
}

export default function ProfileScreen() {
  const { t, lang, nOf } = useI18n();
  const { profile, interests, photos, entries, clearGarden, updateProfile, setDiscoverable, pendingSyncCount, retrySync } = useStore();
  const { signOut, user } = useAuth();
  const { openSheet, showToast } = useUI();
  const navigate = useNavigate();
  const isOrg = profile && profile.accountType === "org";
  const [armed, setArmed] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  // Logging out wipes this device's copy, so anything that never reached
  // the server goes with it. With changes still waiting, the first tap
  // says so and tries once more; the second tap logs out regardless.
  const [logoutArmed, setLogoutArmed] = useState(false);
  function handleLogOut() {
    if (pendingSyncCount > 0 && !logoutArmed) {
      setLogoutArmed(true);
      retrySync();
      return;
    }
    signOut();
  }
  const [exporting, setExporting] = useState(false);

  const currentTheme = (profile && profile.theme) || DEFAULT_THEME;
  const coins = (profile && profile.coins) || 0;
  const equippedDecoration = DECORATIONS.find((d) => d.id === (profile && profile.equippedDecoration)) || null;
  const discoverable = !!(profile && profile.discoverable);
  const soundOn = !(profile && profile.soundOn === false);
  const publicCount = entries.filter((e) => e.visibility === "public").length
    + photos.filter((p) => p.visibility === "public").length;

  // The database refuses these writes outright (20260918000000), so the job
  // here is not to enforce anything — it is to not offer a control that is
  // guaranteed to fail, and to say why instead.
  const consent = useConsentStatus(user && user.id);

  // Only shown to an account that is actually in public.moderators. This is
  // a convenience, not a gate: /reports refuses everyone else at the server.
  const [isMod, setIsMod] = useState(false);
  useEffect(() => {
    let cancelled = false;
    amIModerator().then((v) => { if (!cancelled) setIsMod(v); });
    return () => { cancelled = true; };
  }, []);
  const locked = !!(consent && consent.disclosure_locked);
  const needsReconsent = !!(consent && consent.state === "re_consent_required");

  // null while the iPhone app is still asking iOS; see lib/notifications.
  const permission = useNotificationPermission();
  const granted = permission === "granted";
  const blocked = permission === "denied";
  const unsupported = permission === "unsupported";

  function requestReminders() {
    // Once notifications have been denied, neither a browser nor iOS will
    // show the question again — only their own settings can — so there's
    // nothing for this click to do but ask the first time.
    if (permission === "prompt") requestNotificationPermission();
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

  // Everything this account has put into Forest, as one zip. Slow on a big
  // garden — every photo may have to come down from Storage — so the button
  // says so while it works rather than looking dead.
  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const { blob, missing } = await buildExport({ profile, interests, entries, photos, lang });
      const stamp = new Date().toISOString().slice(0, 10);
      const safeName = String(profile.name || "forest").replace(/[^a-zA-Z0-9_-]+/g, "-");
      await saveFile(blob, `forest-${safeName}-${stamp}.zip`);
      showToast(missing.length
        ? t("exportMissing").replace("{n}", missing.length)
        : t("exportDone"));
    } catch (e) {
      console.error("Export failed:", e);
      showToast(t("exportFailed"));
    }
    setExporting(false);
  }

  // Two taps, same as clearing — but this one can't be undone by anything,
  // so it says so before the second tap rather than after.
  async function handleDeleteAccount() {
    if (!deleteArmed) { setDeleteArmed(true); return; }
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteMyAccount(user && user.id);
    if (!result.ok) {
      setDeleting(false);
      setDeleteArmed(false);
      // Shown on the screen, not just toasted: this one can't be retried
      // into working, and the server's own wording is the only thing that
      // says what actually went wrong.
      setDeleteError(result.reason === "files" ? t("deleteFilesFailed") : result.message);
      showToast(t("deleteAccountFailed"));
      return;
    }
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
            <span className="avatar-edit-badge" aria-hidden="true"><Icon name="pencil" size={13} /></span>
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
            <span aria-hidden="true" style={{ color: "var(--muted)", display: "inline-flex" }}><Icon name="pencil" size={15} /></span>
          </button>
          {!isOrg && (
            <div className="coin-row">
              <span className="chip coin-pill"><Icon name="coin" size={15} />{coins}</span>
              <button className="chip" onClick={() => navigate("/market")}>{t("market")}</button>
            </div>
          )}
        </div>

        {!isOrg && (
          <>
            <Stats items={[
              { n: globalStreak(entries, photos), k: t("totalStreak"), flame: true, icon: "flame", tone: "amber" },
              { n: interests.length, k: nOf(interests.length, "orbsCount"), icon: "tree", tone: "green" },
              { n: photos.length, k: nOf(photos.length, "photos"), icon: "image", tone: "purple" },
              { n: entries.length, k: nOf(entries.length, "entries"), icon: "book", tone: "blue" },
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

        <div className="list-group">
          {!isOrg && (
            <ListRow
              icon="bell"
              disabled={!permission || granted || blocked || unsupported}
              onClick={requestReminders}
              trailing={granted ? <Icon name="check" size={16} /> : null}
            >
              {granted ? t("remindersOn")
                : blocked ? (isNative() ? t("remindersBlockedIos") : t("remindersBlocked"))
                : unsupported ? t("remindersUnsupported")
                : t("turnOn")}
            </ListRow>
          )}
          <ListRow icon={soundOn ? "volume" : "volumeOff"} onClick={() => updateProfile({ soundOn: !soundOn })} trailing={null}>
            {soundOn ? t("soundOn") : t("soundOff")}
          </ListRow>
        </div>

        {locked ? (
          <>
            <div className="label">{t("dlTitle")}</div>
            <div className="safe-note">
              <span aria-hidden="true"><Icon name="lock" size={16} /></span>
              <span>{needsReconsent ? t("dlReconsent") : t("dlBody")}</span>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}

        {!isOrg && !locked && (
          profile.classCode ? (
            <div className="sub">{t("joinedClass")}</div>
          ) : (
            <>
              <div className="list-group">
                <ListRow icon="school" onClick={() => openSheet("joinClass")}>{t("joinClass")}</ListRow>
              </div>
              <div className="sub">{t("joinClassNote")}</div>
            </>
          )
        )}

        {!isOrg && (
          <div className="list-group">
            <ListRow icon="trophy" onClick={() => openSheet("badges")}>{t("badges")}</ListRow>
            <ListRow icon="calendar" onClick={() => openSheet("yearReview")}>{t("yearReview")}</ListRow>
            <ListRow icon="sparkles" onClick={() => openSheet("memories")}>{t("memories")}</ListRow>
            <ListRow icon="eye" onClick={() => openSheet("watching")}>{t("watchingTitle")}</ListRow>
            <ListRow icon="trash" onClick={() => openSheet("trash")}>{t("recentlyDeleted")}</ListRow>
          </div>
        )}

        {/* Both account types have a password, so this sits outside the
            individual-only block above. */}
        <div className="list-group">
          <ListRow icon="key" onClick={() => openSheet("password")}>{t("pwTitle")}</ListRow>
          <ListRow icon="shield" onClick={() => openSheet("recovery")}>{t("recTitle")}</ListRow>
          {isMod && <ListRow icon="flag" onClick={() => navigate("/reports")}>Reports</ListRow>}
        </div>

        {/* Apple 5.1.1(i) wants the policy reachable inside the app, and a
            student or parent looking for it should not have to leave. */}
        <div className="list-group">
          <ListRow icon="lock" onClick={() => { window.location.href = (import.meta.env.BASE_URL || "/") + "privacy"; }}>
            {t("privacyTitle")}
          </ListRow>
          <ListRow icon="book" onClick={() => { window.location.href = (import.meta.env.BASE_URL || "/") + "terms"; }}>
            {t("termsTitle")}
          </ListRow>
          <ListRow icon="help" onClick={() => { window.location.href = (import.meta.env.BASE_URL || "/") + "support"; }}>
            {t("helpTitle")}
          </ListRow>
        </div>

        {!isOrg && <div className="sub">{t("dataNote")}</div>}
        {/* The armed state used to be a label change and nothing else,
            which is easy to tap straight past without noticing anything
            happened at all. */}
        {armed && <div className="sub">{t("clearAllWarning")}</div>}
        {deleteArmed && <div className="sub">{t("deleteAccountWarning")}</div>}
        {deleteError && <div className="field-error" style={{ overflowWrap: "anywhere" }}>{deleteError}</div>}
        {logoutArmed && pendingSyncCount > 0 && <div className="sub">{t("logOutUnsaved")}</div>}
        <div className="list-group">
          {/* Before delete, deliberately: someone about to erase everything
              should pass the way to keep a copy on the way there. */}
          <ListRow icon="download" disabled={exporting} onClick={handleExport} trailing={null}>
            {exporting ? t("exportPreparing") : t("exportData")}
          </ListRow>
          {!isOrg && (
            <ListRow icon="trash" danger disabled={clearing} onClick={handleClear} trailing={null}>
              {armed ? t("confirmClear") : t("clearAll")}
            </ListRow>
          )}
          <ListRow icon="x" danger disabled={deleting} onClick={handleDeleteAccount} trailing={null}>
            {deleteArmed ? t("deleteAccountConfirm") : t("deleteAccount")}
          </ListRow>
          <ListRow icon="logout" onClick={handleLogOut} trailing={null}>
            {logoutArmed && pendingSyncCount > 0 ? t("logOutAnyway") : t("logOut")}
          </ListRow>
        </div>
      </div>
    </>
  );
}
