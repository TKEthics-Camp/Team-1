import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useUI } from "../../ui/UIContext";
import { entriesOf, photosOf, minutesOf, fmtHours } from "../../lib/derived";
import { treeStage, treeHealth, daysPlanted, daysIdle, stageProgress, STAGE_KEY } from "../../lib/tree";
import { ideaCat } from "../../lib/explore";
import Tree from "../shared/Tree";
import Icon, { CATEGORY_LOOK } from "../shared/Icon";

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
  const planted = daysPlanted(it);
  const minutes = minutesOf(entries, it.id);
  const prog = stageProgress(it, entries, photos);
  const pct = Math.round(prog.ratio * 100);
  const look = CATEGORY_LOOK[ideaCat(it.name)];

  // lastActiveDay falls back to the planting day, which isn't a visit.
  const tended = entriesOf(entries, it.id).length > 0 || photosOf(photos, it.id).length > 0 || !!it.revivedAt;
  const idle = daysIdle(it, entries, photos);
  const last = !tended ? t("lastNone")
    : idle <= 0 ? t("lastToday")
    : idle === 1 ? t("lastYesterday")
    : t("lastDays").replace("{n}", idle);

  const open = () => navigate(`/interest/${it.id}?tab=album`);

  return (
    <article className={"tree-card" + (dead ? " is-dead" : "")}>
      <div className="tree-card-art">
        <span className="tree-card-tags">
          <span className={"tag " + (stage >= 3 ? "tag-green" : "tag-grey")}>{t(STAGE_KEY[stage])}</span>
          {health !== "healthy" && (
            <span className={"tag " + (dead ? "tag-grey" : "tag-amber")}>{t(HEALTH_SHORT[health])}</span>
          )}
        </span>
        <span className="tree-card-age">
          {planted === 0 ? t("plantedToday") : t("plantedDays").replace("{n}", planted)}
        </span>
        <Tree interest={it} size={210} stage={stage} health={health} className={health === "healthy" ? "alive" : ""} />
      </div>

      <div className="tree-card-body">
        <div className="tree-card-head">
          <Icon name={look ? look.icon : "tree"} size={18} className="tree-card-ico" />
          {/* The name is the card's link: its hit area is stretched over the
              whole card in CSS, so the card is one tap target without
              nesting the Log button inside another button. */}
          <button type="button" className="tree-card-name" onClick={open}>{nameOf(it)}</button>
          <span className={"tree-card-last" + (dead ? " dead" : "")}>{dead ? t("hlDead") : last}</span>
        </div>

        <div className="tree-card-progress">
          <span>
            <span className="tree-card-count">{fmtHours(minutes)}</span>
            {" · "}
            {prog.to === null
              ? t("logsAll").replace("{a}", prog.acts)
              : t("logsOf").replace("{a}", prog.acts).replace("{b}", prog.to)}
          </span>
          <span className="tree-card-pct">{pct}%</span>
        </div>
        <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t(STAGE_KEY[stage])}>
          <span style={{ width: pct + "%" }} />
        </div>

        <div className="tree-card-foot">
          <span className="tree-card-next">
            {prog.to === null
              ? t("stgFull")
              : t("toStage").replace("{n}", prog.to - prog.acts).replace("{stage}", t(STAGE_KEY[stage + 1]))}
          </span>
          {/* A dead tree can't be logged back to life — reviving it costs
              coins, which its own page explains — so this goes there. */}
          <button
            type="button"
            className="btn2 btn-with-ico tree-card-log"
            onClick={() => (dead ? open() : openSheet("entry", it.id))}
          >
            <Icon name={dead ? "sparkles" : "pencil"} size={15} />
            {dead ? t("reviveShort") : t("logShort")}
          </button>
        </div>
      </div>
    </article>
  );
}
