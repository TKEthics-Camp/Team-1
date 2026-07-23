import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import Mascot from "./Mascot";

const STEPS = [
  { selector: '[data-tour="streak"]', textKey: "tourStreak" },
  { selector: '[data-tour="trees"]', textKey: "tourTrees" },
  { selector: '[data-tour="nav"]', textKey: "tourNav" },
];

const REVEAL_DELAY = 1500;

// A one-time (or replay-on-demand) walkthrough: Sprig hops to a few key
// spots on Home and explains them in a speech bubble. Nothing can be
// skipped for the first REVEAL_DELAY ms — the "tap anywhere to continue"
// line only appears after that, so it reads instead of getting tapped past.
export default function MascotTour({ onDone }) {
  const { t } = useI18n();
  const { updateProfile } = useStore();
  const [stepIndex, setStepIndex] = useState(0);
  const [canAdvance, setCanAdvance] = useState(false);
  const [box, setBox] = useState(null);
  const timerRef = useRef(null);

  const step = STEPS[stepIndex];

  useEffect(() => {
    setCanAdvance(false);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCanAdvance(true), REVEAL_DELAY);

    function place() {
      const appEl = document.querySelector(".app");
      const targetEl = step && document.querySelector(step.selector);
      if (!appEl || !targetEl) { setBox(null); return; }
      const a = appEl.getBoundingClientRect();
      const r = targetEl.getBoundingClientRect();
      setBox({ top: r.top - a.top, left: r.left - a.left, width: r.width, height: r.height, appH: a.height });
    }
    place();
    window.addEventListener("resize", place);
    return () => { clearTimeout(timerRef.current); window.removeEventListener("resize", place); };
  }, [stepIndex]);

  function finish() {
    updateProfile({ tourSeen: true });
    onDone && onDone();
  }

  function advance() {
    if (!canAdvance) return;
    if (stepIndex + 1 < STEPS.length) setStepIndex((i) => i + 1);
    else finish();
  }

  if (!step) return null;

  // Put the speech bubble below the highlight if there's room, else above it.
  const belowSpace = box ? box.appH - (box.top + box.height) : 0;
  const bubbleBelow = box ? belowSpace > 170 : true;

  return (
    <div
      className="tour-overlay"
      onClick={advance}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") advance(); }}
      role="button"
      tabIndex={0}
      aria-label={t("tourSkip")}
    >
      {box && (
        <div
          className="tour-ring"
          style={{ top: box.top - 6, left: box.left - 6, width: box.width + 12, height: box.height + 12 }}
        />
      )}
      <div
        className={"tour-bubble" + (bubbleBelow ? " below" : " above")}
        style={box ? (bubbleBelow ? { top: box.top + box.height + 14 } : { top: box.top - 14 }) : {}}
      >
        <Mascot size={48} className="tour-mascot" />
        <div className="tour-text">
          <p>{t(step.textKey)}</p>
          <span className={"tour-hint" + (canAdvance ? " show" : "")}>{t("tourSkip")}</span>
        </div>
      </div>
    </div>
  );
}
