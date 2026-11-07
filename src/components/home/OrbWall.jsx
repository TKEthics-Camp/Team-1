import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useUI } from "../../ui/UIContext";
import { entriesOf, photosOf, minutesOf, fmtHours } from "../../lib/derived";
import { treeStage, treeHealth, daysIdle, stageProgress, STAGE_KEY } from "../../lib/tree";
import Tree from "../shared/Tree";
import Icon, { hobbyLook } from "../shared/Icon";

// The home grove: one card per hobby, the tree drawn on a quiet grey panel
// above what it needs to keep growing. Each still grows with use and wilts
// when ignored — only the streak in the header is shared across all of them.
export default function OrbWall({ interests, photos, entries }) {
  const { t } = useI18n();
  const { openSheet } = useUI();

  // With nothing planted there is no heading to hang "+ Plant" on, so the
  // empty grove is itself the way to plant the first tree.
  if (!interests.length) {
    return (
      <button className="tree-card tree-card-add" onClick={() => openSheet("orb")}>
        <span className="plus" aria-hidden="true"><Icon name="plus" size={26} /></span>
        <span className="tree-card-add-label">{t("newInterest")}</span>
      </button>
    );
  }

  return (
    <div className="tree-cards">
      {interests.map((it) => (
        <TreeCard key={it.id} interest={it} entries={entries} photos={photos} />
      ))}
    </div>
  );
}

const HEALTH_SHORT = { wilting: "hsWilting", bare: "hsBare", dead: "hsDead" };

function TreeCard({ interest: it, entries, photos }) {
  const { t, nameOf } = useI18n();
  const { openSheet } = useUI();
  const navigate = useNavigate();

  const stage = treeStage(it, entries, photos);
  const health = treeHealth(it, entries, photos);
  const dead = health === "dead";
  const minutes = minutesOf(entries, it.id);
  const prog = stageProgress(it, entries, photos);
  const pct = Math.round(prog.ratio * 100);
  const look = hobbyLook(it.name);

  // lastActiveDay falls back to the planting day, which isn't a visit.
  const tended = entriesOf(entries, it.id).length > 0 || photosOf(photos, it.id).length > 0 || !!it.revivedAt;
  const idle = daysIdle(it, entries, photos);
  const last = !tended ? t("lastNone")
    : idle <= 0 ? t("lastToday")
    : idle === 1 ? t("lastYesterday")
    : t("lastDays").replace("{n}", idle);

  // One quiet line under the name. Hours join it once there are any — "0h"
  // beside "Not logged yet" only said the same thing twice.
  // Beside the hours the day is enough: "Yesterday · 2.8h".
  const when = idle <= 0 ? t("dayToday") : idle === 1 ? t("dayYesterday") : last;
  const sub = dead ? t("hlDead") : minutes > 0 ? when + " · " + fmtHours(minutes) : last;

  const open = () => navigate(`/interest/${it.id}?tab=album`);

  // Kept to what a glance needs: the stage, the tree, who it is, when it
  // was last tended, and how far to the next stage. Days planted, the log
  // count and the percentage live on the tree's own page.
  return (
    <article className={"tree-card" + (dead ? " is-dead" : "")}>
      <div className="tree-card-art">
        <span className="tree-card-tags">
          <span className="tag tag-grey">{t(STAGE_KEY[stage])}</span>
          {health !== "healthy" && (
            <span className={"tag " + (dead ? "tag-grey" : "tag-amber")}>{t(HEALTH_SHORT[health])}</span>
          )}
        </span>
        <Tree interest={it} size={190} stage={stage} health={health} className={health === "healthy" ? "alive" : ""} />
      </div>

      <div className="tree-card-body">
        <div className="tree-card-head">
          <span className={"tree-card-ico stat-ico tag-" + look.tone} aria-hidden="true">
            <Icon name={look.icon} size={18} />
          </span>
          <div className="tree-card-title">
            {/* The name is the card's link: its hit area is stretched over
                the whole card in CSS, so the card is one tap target without
                nesting the Log button inside another button. */}
            <button type="button" className="tree-card-name" onClick={open}>{nameOf(it)}</button>
            <span className={"tree-card-sub" + (dead ? " dead" : "")}>{sub}</span>
          </div>
          {/* A dead tree can't be logged back to life — reviving it costs
              coins, which its own page explains — so this goes there. */}
          <button
            type="button"
            className="tree-card-log"
            onClick={() => (dead ? open() : openSheet("entry", it.id))}
          >
            {dead ? t("reviveShort") : t("logShort")}
          </button>
        </div>

        <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t(STAGE_KEY[stage])}>
          <span style={{ width: pct + "%" }} />
        </div>
        <div className="tree-card-next">
          {prog.to === null
            ? t("stgFull")
            : t("toStage").replace("{n}", prog.to - prog.acts).replace("{stage}", t(STAGE_KEY[stage + 1]))}
        </div>
      </div>
    </article>
  );
}
