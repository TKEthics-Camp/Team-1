import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { pullPublicProfile } from "../../lib/remote";
import { usePhotoURL } from "../../lib/image";
import { entriesOf, photosOf, minutesOf, fmtHours } from "../../lib/derived";
import { treeStage, treeHealth, daysPlanted, STAGE_KEY } from "../../lib/tree";
import TopBar from "../shared/TopBar";
import Stats from "../shared/Stats";
import Tree from "../shared/Tree";
import AlbumTab from "./AlbumTab";
import JournalTab from "./JournalTab";

// A read-only stand-in for the full PhotoViewer (which edits/deletes your
// *own* photos) — someone else's photo has neither of those, just an image
// and a caption, so it doesn't need that sheet's local-store wiring at all.
function PublicPhotoViewer({ photo, onClose }) {
  const { t } = useI18n();
  const url = usePhotoURL(photo);
  return (
    <div className="viewer">
      <img src={url} alt={photo.caption || ""} />
      {photo.caption && <div className="cap">{photo.caption}</div>}
      <button className="btn2" style={{ maxWidth: 220 }} onClick={onClose}>{t("close")}</button>
    </div>
  );
}

// Someone else's orb, opened from a search result (see UserProfileSheet).
// Look-only: no add/edit/delete anywhere.
export default function PublicInterestScreen() {
  const { userId, interestId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, nameOf, nOf } = useI18n();
  const [state, setState] = useState({ loading: true, interests: [], entries: [], photos: [] });
  const [tab, setTab] = useState("album");
  const [openPhotoId, setOpenPhotoId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, interests: [], entries: [], photos: [] });
    pullPublicProfile(userId).then(({ interests, entries, photos }) => {
      if (!cancelled) setState({ loading: false, interests, entries, photos });
    });
    return () => { cancelled = true; };
  }, [userId]);

  const { loading, interests, entries, photos } = state;
  const it = interests.find((x) => x.id === interestId);

  useEffect(() => {
    if (!loading && !it) navigate("/explore", { replace: true });
  }, [loading, it, navigate]);

  if (loading || !it) return null;

  const en = entriesOf(entries, it.id);
  const ph = photosOf(photos, it.id);
  const minutes = minutesOf(entries, it.id);
  const stage = treeStage(it, entries, ph);
  const health = treeHealth(it, entries, ph);
  const planted = daysPlanted(it);
  const openPhoto = ph.find((p) => p.id === openPhotoId);

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

  if (openPhoto) {
    return <PublicPhotoViewer photo={openPhoto} onClose={() => setOpenPhotoId(null)} />;
  }

  return (
    <>
      <TopBar>
        <button className="icon" aria-label={t("home")} onClick={goBack}>←</button>
        <h1>{nameOf(it)}</h1>
        <span className="sub">{t("viewOnly")}</span>
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

        <div className="tabs">
          <button aria-selected={tab === "album"} onClick={() => setTab("album")}>{t("album")}</button>
          <button aria-selected={tab === "journal"} onClick={() => setTab("journal")}>{t("journal")}</button>
        </div>

        <div className="tab-content">
          {tab === "album" ? (
            <AlbumTab photos={ph} onOpenPhoto={setOpenPhotoId} readOnly />
          ) : (
            <JournalTab entries={en} readOnly />
          )}
        </div>
      </div>
    </>
  );
}
