import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useUI } from "../../ui/UIContext";
import { minutesOf, fmtHours } from "../../lib/derived";
import { treeStage, treeHealth } from "../../lib/tree";
import Tree from "../shared/Tree";

// The zoomed-out view: the whole grove at once, two to a row, instead of one
// tree filling the screen. Same data and the same tap targets as the pager —
// only the scale changes, which is the point of a zoom.
export default function ForestGrid({ interests, photos, entries }) {
  const { t, nameOf } = useI18n();
  const { openSheet } = useUI();
  const navigate = useNavigate();

  return (
    <div className="tree-grid">
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
            <Tree
              interest={it}
              size={104}
              stage={stage}
              health={health}
              className={alive && health === "healthy" ? "alive" : ""}
            />
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
