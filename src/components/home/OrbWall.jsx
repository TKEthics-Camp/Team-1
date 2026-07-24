import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useUI } from "../../ui/UIContext";
import { minutesOf, fmtHours } from "../../lib/derived";
import { treeStage, treeHealth, daysPlanted } from "../../lib/tree";
import Tree from "../shared/Tree";

// The home grove: one hobby fills the screen at a time, swipe sideways to
// walk between trees. Each still grows with use and wilts when ignored —
// only the streak underneath is shared across all of them now.
export default function OrbWall({ interests, photos, entries }) {
  const { t, nameOf } = useI18n();
  const { openSheet } = useUI();
  const navigate = useNavigate();
  const pagerRef = useRef(null);
  const [active, setActive] = useState(0);
  const pageCount = interests.length + 1;
  const activeDot = Math.min(active, pageCount - 1);

  function onScroll() {
    const el = pagerRef.current;
    if (!el || !el.clientWidth) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <div className="tree-pager-wrap" data-tour="trees">
      <div className="tree-pager" ref={pagerRef} onScroll={onScroll}>
        {interests.map((it) => {
          const minutes = minutesOf(entries, it.id);
          const stage = treeStage(it, entries, photos);
          const health = treeHealth(it, entries, photos);
          const alive = health !== "dead";
          const planted = daysPlanted(it);
          return (
            <button
              key={it.id}
              className="tree-page"
              aria-label={`${nameOf(it)}, ${health === "dead" ? t("hlDead") : fmtHours(minutes)}`}
              onClick={() => navigate(`/interest/${it.id}?tab=album`)}
            >
              <div className="planted-label">{planted === 0 ? t("plantedToday") : t("plantedDays").replace("{n}", planted)}</div>
              <Tree interest={it} size={280} stage={stage} health={health} className={alive && health === "healthy" ? "alive" : ""} />
              <div className="tree-name">{nameOf(it)}</div>
              <div className="tree-meta">
                {health === "dead" ? <span className="dead">🥀 {t("hlDead")}</span> : fmtHours(minutes)}
              </div>
            </button>
          );
        })}
        <button className="tree-page tree-add" aria-label={t("newInterest")} onClick={() => openSheet("orb")}>
          <div className="plus" aria-hidden="true">+</div>
          <div className="tree-name">{t("newInterest")}</div>
        </button>
      </div>
      {pageCount > 1 && (
        <div className="tree-dots" data-tour="dots">
          {Array.from({ length: pageCount }).map((_, i) => (
            <span key={i} className={"dot" + (i === activeDot ? " on" : "")} />
          ))}
        </div>
      )}
    </div>
  );
}
