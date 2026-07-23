import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { photosOf, entriesOf } from "../../lib/derived";
import TopBar from "../shared/TopBar";
import Stats from "../shared/Stats";
import InterestCover from "./InterestCover";
import AlbumTab from "./AlbumTab";
import JournalTab from "./JournalTab";

// The second page of a hobby: its cover photo, stats, and the album/journal
// tabs — one tap deeper than the tree so the tree's own page stays uncluttered.
export default function InterestEntriesScreen() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "journal" ? "journal" : "album";
  const navigate = useNavigate();
  const { t, nameOf, nOf } = useI18n();
  const { interests, photos, entries } = useStore();
  const { openSheet, openViewer } = useUI();

  const it = interests.find((x) => x.id === id);

  useEffect(() => {
    if (!it) navigate("/", { replace: true });
  }, [it, navigate]);

  if (!it) return null;

  const ph = photosOf(photos, it.id);
  const en = entriesOf(entries, it.id);
  // Cover: a coloured plate until there's a real photo, then the first one
  // they ever added — how this interest started, kept at the top of its page.
  const first = ph.length ? ph[ph.length - 1] : null;

  function setTab(next) {
    setSearchParams(next === "album" ? {} : { tab: next });
  }

  return (
    <>
      <TopBar>
        <button className="icon" aria-label={t("back")} onClick={() => navigate(`/interest/${it.id}`)}>←</button>
        <h1>{nameOf(it)}</h1>
      </TopBar>
      <div className="view">
        <InterestCover interest={it} firstPhoto={first} />

        <Stats items={[
          { n: ph.length, k: nOf(ph.length, "photos") },
          { n: en.length, k: nOf(en.length, "entries") },
        ]} />

        {it.why && <div className="sub">{`“${it.why}”`}</div>}
        {(it.time || (it.friends || []).length > 0) && (
          <div className="chips">
            {it.time && <span className="chip friend">{"🔔 " + it.time}</span>}
            {(it.friends || []).map((f) => <span key={f} className="chip friend">{"@" + f}</span>)}
          </div>
        )}

        <div className="tabs">
          <button aria-selected={tab === "album"} onClick={() => setTab("album")}>{t("album")}</button>
          <button aria-selected={tab === "journal"} onClick={() => setTab("journal")}>{t("journal")}</button>
        </div>

        <div className="scroll">
          {tab === "album" ? (
            <AlbumTab photos={ph} onOpenPhoto={openViewer} />
          ) : (
            <JournalTab entries={en} />
          )}
        </div>

        <button className="btn" onClick={() => openSheet(tab === "album" ? "photo" : "entry", it.id)}>
          {tab === "album" ? t("addPhoto") : t("addEntry")}
        </button>
      </div>
    </>
  );
}
