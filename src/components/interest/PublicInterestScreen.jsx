import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useAuth } from "../../store/AuthContext";
import { useUI } from "../../ui/UIContext";
import {
  pullPublicProfile, listWatchedIds, watchInterest, unwatchInterest,
} from "../../lib/remote";
import { usePhotoURL } from "../../lib/image";
import { entriesOf, photosOf, minutesOf, fmtHours } from "../../lib/derived";
import { treeStage, treeHealth, daysPlanted, STAGE_KEY } from "../../lib/tree";
import TopBar from "../shared/TopBar";
import Stats from "../shared/Stats";
import Tree from "../shared/Tree";
import ReportMenu from "../shared/ReportMenu";
import AlbumTab from "./AlbumTab";
import JournalTab from "./JournalTab";

// A read-only stand-in for the full PhotoViewer (which edits/deletes your
// *own* photos) — someone else's photo has neither of those, just an image,
// a caption, and a way to report it.
function PublicPhotoViewer({ photo, authorId, onClose }) {
  const { t } = useI18n();
  const url = usePhotoURL(photo);
  return (
    <div className="viewer">
      <img src={url} alt={photo.caption || ""} />
      {photo.caption && <div className="cap">{photo.caption}</div>}
      <div className="row" style={{ gap: 10, alignItems: "center" }}>
        <button className="btn2" style={{ maxWidth: 220 }} onClick={onClose}>{t("close")}</button>
        {/* A photo is the likeliest thing in the app to need reporting, and
            this is the only screen where one is looked at properly. */}
        <ReportMenu targetType="photo" targetId={photo.id} authorId={authorId} onReported={onClose} />
      </div>
    </div>
  );
}

// Someone else's orb, opened from a search result (see UserProfileSheet).
// Look-only as far as *their* tree goes — but you can start the same hobby
// yourself, keep an eye on theirs, and report any of it.
export default function PublicInterestScreen() {
  const { userId, interestId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, nameOf, nOf } = useI18n();
  const { interests: myInterests, profile } = useStore();
  const { user } = useAuth();
  const { openSheet, showToast } = useUI();
  const [state, setState] = useState({ loading: true, interests: [], entries: [], photos: [] });
  const [tab, setTab] = useState("album");
  const [openPhotoId, setOpenPhotoId] = useState(null);
  const [watched, setWatched] = useState(false);
  const [hiddenEntries, setHiddenEntries] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, interests: [], entries: [], photos: [] });
    pullPublicProfile(userId).then(({ interests, entries, photos }) => {
      if (!cancelled) setState({ loading: false, interests, entries, photos });
    });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listWatchedIds(user.id).then((ids) => {
      if (!cancelled) setWatched(ids.has(interestId));
    });
    return () => { cancelled = true; };
  }, [user, interestId]);

  const { loading, interests, entries, photos } = state;
  const it = interests.find((x) => x.id === interestId);

  useEffect(() => {
    if (!loading && !it) navigate("/explore", { replace: true });
  }, [loading, it, navigate]);

  if (loading || !it) return null;

  const en = entriesOf(entries, it.id).filter((e) => hiddenEntries.indexOf(e.id) === -1);
  const ph = photosOf(photos, it.id);
  const minutes = minutesOf(entries, it.id);
  const stage = treeStage(it, entries, ph);
  const health = treeHealth(it, entries, ph);
  const planted = daysPlanted(it);
  const openPhoto = ph.find((p) => p.id === openPhotoId);

  const isOrg = profile && profile.accountType === "org";
  // Matching by name, not id: starting "Basketball" from someone else's tree
  // makes your own separate tree, it doesn't join theirs.
  const mine = myInterests.find((x) => x.name.toLowerCase() === it.name.toLowerCase());

  // A plain navigate(-1) lands on whatever page was underneath — the sheet
  // this was opened from (see UserProfileSheet) isn't part of the URL, so
  // history alone forgets it was ever open. Reopen it explicitly instead.
  function goBack() {
    const reopen = location.state && location.state.reopenUserProfile;
    if (reopen) {
      navigate((location.state && location.state.from) || "/explore", { state: { openUserProfile: reopen } });
    } else {
      navigate(-1);
    }
  }

  // Same one-liner IdeaSheet, StudentSheet, IdeaCard and PostCard all use —
  // this screen was the only place showing a real hobby that never got it.
  function startThis() {
    if (mine) openSheet("entry", mine.id);
    else openSheet("orb", { preset: { name: it.name, nameZh: it.name, color: it.color } });
  }

  async function toggleWatch() {
    if (!user) return;
    const next = !watched;
    setWatched(next); // optimistic; the button is the only thing it controls
    const ok = next
      ? await watchInterest(user.id, it.id)
      : await unwatchInterest(user.id, it.id);
    if (!ok) { setWatched(!next); showToast(t("actionFailed")); return; }
    showToast(t(next ? "watchedToast" : "unwatchedToast"));
  }

  if (openPhoto) {
    return <PublicPhotoViewer photo={openPhoto} authorId={userId} onClose={() => setOpenPhotoId(null)} />;
  }

  return (
    <>
      <TopBar>
        <button className="icon" aria-label={t("home")} onClick={goBack}>←</button>
        <h1>{nameOf(it)}</h1>
        <span className="sub grow">{t("viewOnly")}</span>
        {/* Reports the tree itself. Blocking its owner takes their whole
            profile out of view, so there's nothing left here to look at. */}
        <ReportMenu
          targetType="interest"
          targetId={it.id}
          authorId={userId}
          onBlocked={() => navigate("/explore", { replace: true })}
        />
      </TopBar>
      <div className="view">
        <div className="planted-label center-label">
          {planted === 0 ? t("plantedToday") : t("plantedDays").replace("{n}", planted)}
        </div>

        <div className="tree-status">
          <Tree interest={it} size={84} stage={stage} health={health} />
          <div className="info">
            <div className="st-stage">{t(STAGE_KEY[stage])}</div>
          </div>
        </div>

        <Stats items={[
          { n: fmtHours(minutes), k: t("hours") },
          { n: ph.length, k: nOf(ph.length, "photos") },
          { n: en.length, k: nOf(en.length, "entries") },
        ]} />

        {it.why && <div className="sub">{`“${it.why}”`}</div>}

        {/* An org account has no garden of its own to start a hobby in. */}
        {!isOrg && (
          <div className="row" style={{ gap: 10 }}>
            <button className="btn2 grow" onClick={startThis}>
              {mine ? t("logYours") : t("startThis")}
            </button>
            <button
              className="btn2 grow"
              aria-pressed={watched ? "true" : "false"}
              onClick={toggleWatch}
            >
              {watched ? t("watching") : t("watch")}
            </button>
          </div>
        )}

        <div className="tabs">
          <button aria-selected={tab === "album"} onClick={() => setTab("album")}>{t("album")}</button>
          <button aria-selected={tab === "journal"} onClick={() => setTab("journal")}>{t("journal")}</button>
        </div>

        <div className="tab-content">
          {tab === "album" ? (
            <AlbumTab photos={ph} onOpenPhoto={setOpenPhotoId} readOnly />
          ) : (
            <JournalTab
              entries={en}
              readOnly
              authorId={userId}
              onEntryReported={(id) => setHiddenEntries((prev) => prev.concat(id))}
            />
          )}
        </div>
      </div>
    </>
  );
}
