import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import Mascot from "./Mascot";

// Six stops across all three tabs — Home, Explore, and Me — so the tour
// actually covers the app instead of just the screen you land on first.
// `path` is optional; omit it to stay on the current screen.
const STEPS = [
  { path: "/", selector: '[data-tour="streak"]', textKey: "tourStreak" },
  { path: "/", selector: '[data-tour="trees"]', textKey: "tourTrees" },
  { path: "/", selector: '[data-tour="dots"]', textKey: "tourDots" },
  { path: "/", selector: '[data-tour="nav"]', textKey: "tourNav" },
  { path: "/explore", selector: '[data-tour="exploreTabs"]', textKey: "tourExplore" },
  { path: "/profile", selector: '[data-tour="yearReview"]', textKey: "tourProfile" },
];

const REVEAL_DELAY = 900;

// A one-time (or replay-on-demand) walkthrough: Sprig hops between Home,
// Explore, and Me, pointing out a few things in a speech bubble at each
// stop. Nothing can be skipped for the first REVEAL_DELAY ms — the "tap
// anywhere to continue" line only appears after that, so it reads instead
// of getting tapped past.
export default function MascotTour({ onDone }) {
  const { t } = useI18n();
  const { updateProfile } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [stepIndex, setStepIndex] = useState(0);
  const [canAdvance, setCanAdvance] = useState(false);
  const [box, setBox] = useState(null);
  const timerRef = useRef(null);
  const bubbleRef = useRef(null);
  const [bubbleH, setBubbleH] = useState(150); // measured after first paint; a sane guess until then

  const step = STEPS[stepIndex];
  const onTargetScreen = !step || !step.path || location.pathname === step.path;

  // If this step lives on a different screen, navigate there first — the
  // placement effect below re-fires once location.pathname catches up.
  useEffect(() => {
    if (step && step.path && location.pathname !== step.path) navigate(step.path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  useEffect(() => {
    if (!onTargetScreen) return;
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
  }, [stepIndex, onTargetScreen]);

  // Keep the measured bubble height current — its text length varies step
  // to step, so a fixed guess isn't enough to reliably clamp placement.
  useLayoutEffect(() => {
    if (bubbleRef.current) setBubbleH(bubbleRef.current.offsetHeight);
  });

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
  // Still mid-navigation to this step's screen — nothing to point at yet.
  if (!onTargetScreen) return null;

  // Put the speech bubble below the highlight if it fits there, else above
  // it — and either way, clamp the final position so it always stays fully
  // inside the frame instead of running off the top (the frame clips
  // overflow, so anything above y=0 would just be invisible).
  const margin = 10;
  let bubbleTop = margin;
  if (box) {
    const below = box.top + box.height + 14;
    const above = box.top - 14 - bubbleH;
    const fitsBelow = below + bubbleH <= box.appH - margin;
    bubbleTop = fitsBelow ? below : above;
    bubbleTop = Math.min(Math.max(bubbleTop, margin), Math.max(margin, box.appH - bubbleH - margin));
  }

  return (
    <div
      className="tour-overlay"
      onClick={advance}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") advance(); }}
      role="button"
      tabIndex={0}
      aria-label={t("tourSkip")}
    >
      <div className="tour-progress">
        {STEPS.map((_, idx) => (
          <span key={idx} className={"seg" + (idx < stepIndex ? " done" : idx === stepIndex ? " on" : "")} />
        ))}
      </div>
      {box && (
        <div
          className="tour-ring"
          style={{ top: box.top - 6, left: box.left - 6, width: box.width + 12, height: box.height + 12 }}
        />
      )}
      <div ref={bubbleRef} className="tour-bubble" style={{ top: bubbleTop }}>
        <Mascot size={48} className="tour-mascot" />
        <div className="tour-text">
          <p>{t(step.textKey)}</p>
          <span className={"tour-hint" + (canAdvance ? " show" : "")}>{t("tourSkip")}</span>
        </div>
      </div>
    </div>
  );
}
