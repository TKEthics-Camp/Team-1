import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { photosOf, entriesOf, globalStreak } from "../../lib/derived";
import { treeStage, treeHealth, daysPlanted, actsToNextStage, growthTimeline, STAGE_KEY, HEALTH_KEY, REVIVE_COST } from "../../lib/tree";
import TopBar from "../shared/TopBar";
import Stats from "../shared/Stats";
import Tree from "../shared/Tree";
import InterestCover from "./InterestCover";
import AlbumTab from "./AlbumTab";
import JournalTab from "./JournalTab";
import GrowthReplay from "./GrowthReplay";

export default function InterestScreen() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "journal" ? "journal" : "album";
  const navigate = useNavigate();
  const { t, nameOf, nOf } = useI18n();
  const { interests, photos, entries, profile, reviveInterest } = useStore();
  const { openSheet, openViewer } = useUI();

  const it = interests.find((x) => x.id === id);
  // Preview: instantly see what this tree looks like at any stage/health,
  // without waiting for real activity or real neglect.
  const [preview, setPreview] = useState(null); // { stage, health } | null
  const [replaying, setReplaying] = useState(false);

  useEffect(() => {
    if (!it) navigate("/", { replace: true });
  }, [it, navigate]);

  if (!it) return null;

  const ph = photosOf(photos, it.id);
  const en = entriesOf(entries, it.id);
  const st = globalStreak(entries, photos);
  // Cover: a coloured plate until there's a real photo, then the first one
  // they ever added — how this interest started, kept at the top of its page.
  const first = ph.length ? ph[ph.length - 1] : null;

  const realStage = treeStage(it, entries, photos);
  const realHealth = treeHealth(it, entries, photos);
  const toNext = actsToNextStage(it, entries, photos);
  const stage = preview ? preview.stage : realStage;
  const health = preview ? preview.health : realHealth;
  const planted = daysPlanted(it);
  const coins = (profile && profile.coins) || 0;
  const canRevive = coins >= REVIVE_COST;
  const timeline = growthTimeline(it, entries, photos);
  const canReplay = timeline.length > 1; // more than just the seed frame

  function setTab(next) {
    setSearchParams(next === "album" ? {} : { tab: next });
  }

  return (
    <>
      <TopBar>
        <button className="icon" aria-label={t("home")} onClick={() => navigate("/")}>←</button>
        <h1>{nameOf(it)}</h1>
        <button className="icon" aria-label={t("editOrb")} onClick={() => openSheet("orb", it.id)}>⋯</button>
      </TopBar>
      <div className="view">
        <InterestCover interest={it} firstPhoto={first} />

        <div className="planted-label center-label">
          {planted === 0 ? t("plantedToday") : t("plantedDays").replace("{n}", planted)}
        </div>

        <div className={"tree-status" + (health === "dead" ? " dead" : "")}>
          <Tree interest={it} size={84} stage={stage} health={health} />
          <div className="info">
            <div className="st-stage">{t(STAGE_KEY[stage])}</div>
            <div className="st-health">{t(HEALTH_KEY[health])}</div>
            {health === "dead" ? (
              <div className="st-note">{canRevive ? t("reviveHint") : t("reviveNeed").replace("{n}", REVIVE_COST)}</div>
            ) : preview ? (
              <div className="st-note">{t("grewNote")}</div>
            ) : toNext > 0 ? (
              <div className="st-note">{t("growNext").replace("{n}", toNext)}</div>
            ) : (
              <div className="st-note">{t("grownFull")}</div>
            )}
          </div>
        </div>

        {realHealth === "dead" && (
          <button
            className="btn revive-btn"
            disabled={!canRevive}
            onClick={() => reviveInterest(it.id)}
          >
            {t("reviveBtn").replace("{n}", REVIVE_COST)}
          </button>
        )}

        {canReplay && (
          <button className="btn2" onClick={() => setReplaying(true)}>{t("watchGrow")}</button>
        )}

        <div className="label">{t("previewLabel")}</div>
        <div className="preview-row">
          {[0, 1, 2, 3, 4].map((s) => (
            <button
              key={s}
              className="chip"
              aria-pressed={stage === s && health === "healthy" && !!preview}
              onClick={() => setPreview({ stage: s, health: "healthy" })}
            >
              {s}
            </button>
          ))}
          {["wilting", "bare", "dead"].map((h) => (
            <button
              key={h}
              className="chip"
              aria-pressed={preview?.health === h}
              onClick={() => setPreview({ stage: realStage, health: h })}
            >
              {t(HEALTH_KEY[h])}
            </button>
          ))}
          {preview && (
            <button className="chip" onClick={() => setPreview(null)}>{"↺ " + t("close")}</button>
          )}
        </div>

        <Stats items={[
          { n: st, k: t("yourStreak"), flame: true },
          { n: ph.length, k: nOf(ph.length, "photos") },
          { n: en.length, k: nOf(en.length, "entries") },
        ]} />

        {it.why && <div className="sub">{`“${it.why}”`}</div>}
        {(it.time || (it.friends || []).length > 0) && (
          <div className="chips">
            {it.time && <span className="chip friend">{"🔔 " + it.time}</span>}
            {(it.friends || []).map((f) => <span key={f} className="chip friend">{"@" + f}</span>)}
          </div>
        )}

        <div className="tabs">
          <button aria-selected={tab === "album"} onClick={() => setTab("album")}>{t("album")}</button>
          <button aria-selected={tab === "journal"} onClick={() => setTab("journal")}>{t("journal")}</button>
        </div>

        <div className="tab-content">
          {tab === "album" ? (
            <AlbumTab photos={ph} onOpenPhoto={openViewer} />
          ) : (
            <JournalTab entries={en} />
          )}
        </div>

        <button className="btn" onClick={() => openSheet(tab === "album" ? "photo" : "entry", it.id)}>
          {tab === "album" ? t("addPhoto") : t("addEntry")}
        </button>

        {replaying && (
          <GrowthReplay
            interest={it}
            frames={timeline}
            health={realHealth}
            nameOf={nameOf}
            onClose={() => setReplaying(false)}
          />
        )}
      </div>
    </>
  );
}
