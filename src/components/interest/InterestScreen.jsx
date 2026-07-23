import { useEffect } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { photosOf, entriesOf, journaledDaysThisMonth } from "../../lib/derived";
import { PALETTE } from "../../lib/constants";
import TopBar from "../shared/TopBar";
import Avatar from "../shared/Avatar";
import Fab from "../shared/Fab";
import AlbumTab from "./AlbumTab";
import JournalTab from "./JournalTab";

export default function InterestScreen() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "journal" ? "journal" : "album";
  const navigate = useNavigate();
  const { t, nameOf, nOf } = useI18n();
  const { profile, interests, photos, entries } = useStore();
  const { openSheet, openViewer } = useUI();

  const it = interests.find((x) => x.id === id);

  useEffect(() => {
    if (!it) navigate("/", { replace: true });
  }, [it, navigate]);

  if (!it) return null;

  const ph = photosOf(photos, it.id);
  const en = entriesOf(entries, it.id);
  const activeDays = journaledDaysThisMonth(entries, it.id);

  function setTab(next) {
    setSearchParams(next === "album" ? {} : { tab: next });
  }

  return (
    <>
      <TopBar>
        <button className="back-btn" onClick={() => navigate("/")}>
          <ArrowLeft size={15} /> {t("home")}
        </button>
        <div className="grow" />
        <Avatar
          color={profile.color || PALETTE[0]}
          initial={profile.name}
          size={34}
          onClick={() => navigate("/profile")}
        />
      </TopBar>
      <div className="view">
        <h1 className="page-title">{nameOf(it)}</h1>
        {it.why && <p className="page-subtitle">{`“${it.why}”`}</p>}

        <div className="tabs">
          <button aria-selected={tab === "album"} onClick={() => setTab("album")}>{t("album")}</button>
          <button aria-selected={tab === "journal"} onClick={() => setTab("journal")}>{t("journal")}</button>
        </div>

        <div className="stat-line">
          {ph.length} {nOf(ph.length, "photos")} · {t("journaledDays").replace("{n}", activeDays)}
        </div>

        <div className="scroll">
          {tab === "album" ? (
            <AlbumTab photos={ph} onOpenPhoto={openViewer} />
          ) : (
            <JournalTab entries={en} />
          )}
        </div>

        <Fab
          icon={<Plus size={22} strokeWidth={2.5} />}
          aria-label={tab === "album" ? t("addPhoto") : t("addEntry")}
          onClick={() => openSheet(tab === "album" ? "photo" : "entry", it.id)}
        />
      </div>
    </>
  );
}
