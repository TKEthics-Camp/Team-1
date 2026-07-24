import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useUI } from "../../ui/UIContext";
import { minutesOf, fmtHours } from "../../lib/derived";
import { treeStage, treeHealth } from "../../lib/tree";
import Tree from "../shared/Tree";

// The home grove as a two-column grid (like a profile grid) that scrolls
// down with the rest of the page, instead of one tree per screen swiped
// through sideways — every hobby is visible at a glance. The "+" tile to
// plant a new one always sits last.
export default function OrbWall({ interests, photos, entries }) {
  const { t, nameOf } = useI18n();
  const { openSheet } = useUI();
  const navigate = useNavigate();

  return (
    <div className="tree-grid" data-tour="trees">
      {interests.map((it) => {
        const minutes = minutesOf(entries, it.id);
        const stage = treeStage(it, entries, photos);
        const health = treeHealth(it, entries, photos);
        const alive = health !== "dead";
        return (
          <button
            key={it.id}
            className="tree-cell"
            aria-label={`${nameOf(it)}, ${health === "dead" ? t("hlDead") : fmtHours(minutes)}`}
            onClick={() => navigate(`/interest/${it.id}?tab=album`)}
          >
            <Tree interest={it} size={110} stage={stage} health={health} className={alive && health === "healthy" ? "alive" : ""} />
            <div className="tree-name">{nameOf(it)}</div>
            <div className="tree-meta">
              {health === "dead" ? <span className="dead">🥀 {t("hlDead")}</span> : fmtHours(minutes)}
            </div>
          </button>
        );
      })}
      <button className="tree-cell tree-add" aria-label={t("newInterest")} onClick={() => openSheet("orb")}>
        <div className="plus" aria-hidden="true">+</div>
        <div className="tree-name">{t("newInterest")}</div>
      </button>
    </div>
  );
}
