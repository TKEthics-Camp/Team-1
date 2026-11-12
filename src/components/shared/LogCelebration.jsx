import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { fmtDuration } from "../../lib/derived";
import { STAGE_KEY } from "../../lib/tree";
import Tree from "./Tree";
import Icon from "./Icon";
import StreakFlame from "./StreakFlame";

// How long the moment stays before it leaves by itself. Growing a stage is
// rarer and has more to show, so it gets longer.
const STAY_MS = 2800;
const GROW_STAY_MS = 4400;
// On a new stage the old tree is shown first, then swapped: a tree that is
// simply already bigger isn't growth, it's a different picture.
const GROW_AT_MS = 750;

// Drawn larger for young stages, as on the Home cards, so a sprout isn't a
// speck in the middle of the screen.
const TREE_SIZE = [330, 320, 270, 235, 220];

// The moment after a log. The PRD's premise is that logging has to pay off
// as immediately as the things it competes with, so this is the payoff, and
// everything on it is true: the time that was just logged, the tree where it
// actually stands, the bar moving exactly as far as this log moved it, the
// coins and — only when today's log extended it — the streak.
//
// One tap anywhere dismisses it; it also leaves on its own, so logging is
// never a screen that has to be cleared.
export default function LogCelebration() {
  const { celebration, closeCelebration } = useUI();
  if (!celebration) return null;
  // Keyed, so a second log straight after the first replays from the start.
  return <Moment key={celebration.id} c={celebration} onClose={closeCelebration} />;
}

function Moment({ c, onClose }) {
  const { t, nameOf } = useI18n();
  const { interests } = useStore();
  const it = interests.find((x) => x.id === c.interestId);
  const [filled, setFilled] = useState(false);
  const [grown, setGrown] = useState(!c.leveledUp);

  useEffect(() => {
    // Two frames, so the bar is painted at its old width before it moves.
    let raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => setFilled(true)); });
    const grow = c.leveledUp ? setTimeout(() => setGrown(true), GROW_AT_MS) : null;
    const leave = setTimeout(onClose, c.leveledUp ? GROW_STAY_MS : STAY_MS);
    return () => { cancelAnimationFrame(raf); clearTimeout(grow); clearTimeout(leave); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!it) return null;

  const name = nameOf(it);
  const stage = grown ? c.after.stage : c.before.stage;
  const showGrowth = c.leveledUp && grown;
  // Reaching a stage fills the bar; otherwise it moves as far as this log did.
  const ratio = !filled ? c.before.ratio : c.leveledUp ? 1 : c.after.ratio;
  const headline = showGrowth ? t(STAGE_KEY[c.after.stage]) : c.minutes > 0 ? "+" + fmtDuration(c.minutes) : "+1";
  const sub = showGrowth
    ? t("celGrew").replace("{name}", name)
    : c.minutes > 0 ? name : t("celPhoto").replace("{name}", name);
  const next = c.after.to === null
    ? t("stgFull")
    : t("toStage").replace("{n}", c.after.to - c.after.acts).replace("{stage}", t(STAGE_KEY[c.after.stage + 1]));

  return (
    <div
      className={"cel" + (showGrowth ? " cel-grew" : "")}
      role="dialog"
      aria-label={c.minutes > 0
        ? t("celLogged").replace("{d}", fmtDuration(c.minutes)).replace("{name}", name)
        : t("celPhoto").replace("{name}", name)}
      style={{ "--c": it.color }}
    >
      <button type="button" className="cel-close" aria-label={t("celContinue")} onClick={onClose} autoFocus />
      <div className="cel-body">
        <div className="cel-stage">
          {/* Re-keyed on the stage so the burst and the pop replay when the
              tree grows mid-moment. */}
          <span className="cel-burst" key={"b" + stage} aria-hidden="true">
            {Array.from({ length: 12 }).map((_, i) => <i key={i} style={{ "--i": i }} />)}
          </span>
          <span className="cel-tree" key={"t" + stage}>
            <Tree interest={it} size={TREE_SIZE[stage]} stage={stage} health="healthy" className="alive" />
          </span>
        </div>

        <div className="cel-text" key={showGrowth ? "grew" : "logged"}>
          <div className="cel-headline">{headline}</div>
          <div className="cel-sub">{sub}</div>
        </div>

        <div className="cel-progress">
          <div className="bar"><span style={{ width: Math.round(ratio * 100) + "%" }} /></div>
          <div className="cel-next">{next}</div>
        </div>

        <div className="cel-chips">
          {c.coins > 0 && (
            <span className="cel-chip"><Icon name="coin" size={15} />+{c.coins}</span>
          )}
          {c.streakGrew && (
            <span className="cel-chip cel-streak">
              <StreakFlame size={13} />
              {t("celStreak").replace("{n}", c.streak)}
            </span>
          )}
        </div>
      </div>
      <div className="cel-hint">{t("celContinue")}</div>
    </div>
  );
}
