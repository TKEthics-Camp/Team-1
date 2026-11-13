import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { photosOf, entriesOf, globalStreak, minutesOf, fmtHours } from "../../lib/derived";
import { treeStage, treeHealth, daysPlanted, stageProgress, growthTimeline, STAGE_KEY, HEALTH_KEY, REVIVE_COST } from "../../lib/tree";
import TopBar from "../shared/TopBar";
import Icon from "../shared/Icon";
import Tree from "../shared/Tree";
import InterestCover from "./InterestCover";
import AlbumTab from "./AlbumTab";
import JournalTab from "./JournalTab";
import GrowthReplay from "./GrowthReplay";

// The same sizing as Home's cards, a step larger: this is the tree's own
// page, and the tree should be the biggest thing on it at every stage.
const HERO_TREE_SIZE = [340, 330, 290, 255, 235];

export default function InterestScreen() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, nameOf, nOf } = useI18n();
  const { interests, photos, entries, profile, reviveInterest } = useStore();
  const { openSheet, openViewer, showToast, session, startSession } = useUI();

  const it = interests.find((x) => x.id === id);
  const [replaying, setReplaying] = useState(false);

  useEffect(() => {
    if (!it) navigate("/", { replace: true });
  }, [it, navigate]);

  if (!it) return null;

  const ph = photosOf(photos, it.id);
  const en = entriesOf(entries, it.id);
  const st = globalStreak(entries, photos);
  // Opens on whichever tab has something in it: an album with no photos was
  // the first thing most trees showed, with the journal a tap away.
  const asked = searchParams.get("tab");
  const tab = asked === "journal" || asked === "album" ? asked : ph.length ? "album" : "journal";
  // The cover is a real photo: the pinned one, otherwise the first ever
  // added — how this interest started, kept at the top of its page. With no
  // photo yet there is no cover; the tree below is the page's picture.
  const first = ph.find((p) => p.isPinned) || (ph.length ? ph[ph.length - 1] : null);

  const stage = treeStage(it, entries, photos);
  const health = treeHealth(it, entries, photos);
  const dead = health === "dead";
  const prog = stageProgress(it, entries, photos);
  const pct = Math.round(prog.ratio * 100);
  const planted = daysPlanted(it);
  const coins = (profile && profile.coins) || 0;
  const canRevive = coins >= REVIVE_COST;
  const timeline = growthTimeline(it, entries, photos);
  const canReplay = timeline.length > 1; // more than just the seed frame

  function setTab(next) {
    setSearchParams({ tab: next }, { replace: true });
  }

  function startTimer() {
    startSession(it.id);
    showToast(t("timerStarted"));
  }

  return (
    <>
      <TopBar className="tree-bar">
        {/* Entered from Home, a Memories/Watching sheet, or a nudge banner —
            never the same place twice. A hardcoded navigate("/") here used
            to send every one of those back to Home regardless of which it
            was; real browser/router back returns to whichever actually
            opened this tree. */}
        <button className="icon" aria-label={t("back")} onClick={() => navigate(-1)}><Icon name="chevronLeft" size={22} /></button>
        <h1>{nameOf(it)}</h1>
        <button className="icon" aria-label={t("editOrb")} onClick={() => openSheet("orb", it.id)}>⋯</button>
      </TopBar>
      <div className="view tree-view">
        {first && <InterestCover interest={it} firstPhoto={first} />}

        {/* The tree itself, as on Home but larger, with everything about
            its growth in one card: stage, health, how long it has stood,
            and how far to the next stage. */}
        <section className={"tree-card tree-hero" + (dead ? " is-dead" : "")} style={{ "--c": it.color }}>
          <div className="tree-card-art">
            <span className="tree-card-tags">
              <span className="tag tag-grey">{t(STAGE_KEY[stage])}</span>
            </span>
            <span className="tree-card-age">
              {planted === 0 ? t("plantedToday") : t("plantedDays").replace("{n}", planted)}
            </span>
            <Tree interest={it} size={HERO_TREE_SIZE[stage]} stage={stage} health={health} className={health === "healthy" ? "alive" : ""} />
            {canReplay && (
              <button type="button" className="hero-replay" aria-label={t("watchGrow")} title={t("watchGrow")} onClick={() => setReplaying(true)}>
                <Icon name="sparkles" size={17} />
              </button>
            )}
          </div>
          <div className="tree-card-body">
            <div className="hero-line">
              <span className={"hero-health" + (health === "healthy" ? "" : dead ? " dead" : " warn")}>{t(HEALTH_KEY[health])}</span>
              <span className="hero-next">
                {dead ? "" : prog.to === null
                  ? t("stgFull")
                  : t("toStage").replace("{n}", prog.to - prog.acts).replace("{stage}", t(STAGE_KEY[stage + 1]))}
              </span>
            </div>
            <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t(STAGE_KEY[stage])}>
              <span style={{ width: pct + "%" }} />
            </div>
            {dead && (
              <>
                <div className="sub hero-revive-note">{canRevive ? t("reviveHint") : t("reviveNeed").replace("{n}", REVIVE_COST)}</div>
                <button
                  className="btn revive-btn"
                  disabled={!canRevive}
                  onClick={() => { if (reviveInterest(it.id)) showToast(t("coinsSpent").replace("{n}", REVIVE_COST)); }}
                >
                  {t("reviveBtn").replace("{n}", REVIVE_COST)}
                </button>
              </>
            )}
          </div>
        </section>

        {/* The three things there are to do here, where the thumb is rather
            than under the whole journal. The timer steps aside while one is
            running — the pill above the tab bar is its control then. */}
        <div className="hero-actions">
          <button className="btn btn-with-ico" onClick={() => openSheet("entry", it.id)}>
            <Icon name="pencil" size={16} />{t("logShort")}
          </button>
          {!session && (
            <button className="btn2 btn-with-ico" onClick={startTimer}>
              <Icon name="clock" size={16} />{t("timerShort")}
            </button>
          )}
          <button className="btn2 btn-with-ico" onClick={() => openSheet("photo", it.id)}>
            <Icon name="image" size={16} />{t("photoShort")}
          </button>
        </div>

        <div className="me-stats">
          {[
            [fmtHours(minutesOf(entries, it.id)), t("timeLogged")],
            [en.length, nOf(en.length, "entries")],
            [ph.length, nOf(ph.length, "photos")],
            [st, t("yourStreak")],
          ].map(([n, k]) => (
            <div className="me-stat" key={k}>
              <span className="n">{n}</span>
              <span className="k">{k}</span>
            </div>
          ))}
        </div>

        {it.why && <div className="sub hero-why">{`“${it.why}”`}</div>}

        <div className="tabs">
          <button aria-selected={tab === "journal"} onClick={() => setTab("journal")}>{t("journal")}</button>
          <button aria-selected={tab === "album"} onClick={() => setTab("album")}>{t("album")}</button>
        </div>

        <div className="tab-content">
          {tab === "album" ? (
            <AlbumTab photos={ph} onOpenPhoto={openViewer} />
          ) : (
            <JournalTab entries={en} />
          )}
        </div>

        {replaying && (
          <GrowthReplay
            interest={it}
            frames={timeline}
            health={health}
            nameOf={nameOf}
            onClose={() => setReplaying(false)}
          />
        )}
      </div>
    </>
  );
}
