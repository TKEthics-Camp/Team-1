import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useUI } from "../../ui/UIContext";
import { minutesOf, fmtHours } from "../../lib/derived";
import { treeStage, treeHealth } from "../../lib/tree";
import Tree from "../shared/Tree";

const SIZES = [128, 120, 132, 116, 128, 120];

// The home shelf: every hobby is a tree standing on the ground. It grows with
// use and wilts when ignored, so the wall shows at a glance what's thriving.
// The streak lives on the Me page now (one, shared across every hobby) —
// each tree here just shows its own hours logged.
export default function OrbWall({ interests, photos, entries }) {
  const { t, nameOf } = useI18n();
  const { openSheet } = useUI();
  const navigate = useNavigate();

  return (
    <div className="tree-wall">
      {interests.map((it, i) => {
        const size = SIZES[i % SIZES.length];
        const minutes = minutesOf(entries, it.id);
        const stage = treeStage(it, entries, photos);
        const health = treeHealth(it, entries, photos);
        return (
          <button
            key={it.id}
            className="tree-cell"
            aria-label={`${nameOf(it)}, ${health === "dead" ? t("hlDead") : fmtHours(minutes)}`}
            onClick={() => navigate(`/interest/${it.id}`)}
          >
            <Tree interest={it} size={size} stage={stage} health={health} />
            <div className="tree-name">{nameOf(it)}</div>
            <div className="tree-meta">
              {health === "dead" ? (
                <span className="dead">🥀 {t("hlDead")}</span>
              ) : (
                fmtHours(minutes)
              )}
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
