import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { fmtDate } from "../../lib/dates";
import { STAGE_KEY } from "../../lib/tree";
import Tree from "../shared/Tree";

// Whole replay, seed to full tree, lands in this window regardless of how
// many logs the tree actually has — a tree with 30 logs and one with 6
// both finish in about the same handful of seconds. There are at most 5
// frames (stage 0 through 4), so this divides evenly without ever feeling
// rushed or dragging.
const TOTAL_MS = 7000;
// How long the final "today" frame holds, showing the tree's real health,
// before it's fully settled — tap-to-close still works immediately, this
// just delays the auto-close-on-tap so the ending isn't skippable by accident.
const HOLD_MS = 1400;

export default function GrowthReplay({ interest, frames, health, nameOf, onClose }) {
  const { t, lang } = useI18n();
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const last = i >= frames.length - 1;

  useEffect(() => {
    if (last) {
      const h = setTimeout(() => setDone(true), HOLD_MS);
      return () => clearTimeout(h);
    }
    const per = Math.max(500, TOTAL_MS / frames.length);
    const tm = setTimeout(() => setI((n) => n + 1), per);
    return () => clearTimeout(tm);
  }, [i, last, frames.length]);

  const frame = frames[i];

  return (
    <div className="year-full" onClick={done ? onClose : undefined} role="button" tabIndex={0}>
      <button className="year-close" aria-label={t("close")} onClick={(e) => { e.stopPropagation(); onClose(); }}>✕</button>
      <div className="year-progress">
        {frames.map((_, idx) => (
          <span key={idx} className={"seg" + (idx < i ? " done" : idx === i ? " on" : "")} />
        ))}
      </div>
      <div className="year-card year-card-full">
        <Tree
          interest={interest}
          size={200}
          stage={frame.stage}
          health={done ? health : "healthy"}
          className={done && health === "healthy" ? "alive" : ""}
        />
        <div className="label">{fmtDate(frame.date, lang)}</div>
        <div className="year-big" style={{ fontSize: 24 }}>{t(STAGE_KEY[frame.stage])}</div>
        {done && <div className="sub">{t("growthReplayDone").replace("{name}", nameOf(interest))}</div>}
      </div>
      {done && <button className="btn year-next" onClick={onClose}>{t("close")}</button>}
    </div>
  );
}
