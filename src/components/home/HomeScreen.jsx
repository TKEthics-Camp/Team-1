import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { dueNudges } from "../../lib/reminders";
import { getResurfacedMemory } from "../../lib/resurfaced";
import { globalStreakDetail } from "../../lib/derived";
import { isDyingSoon, daysUntilDeath } from "../../lib/tree";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import StreakFlame from "../shared/StreakFlame";
import NudgeBanner from "./NudgeBanner";
import MemoryBanner from "./MemoryBanner";
import DyingBanner from "./DyingBanner";
import OrbWall from "./OrbWall";
import ForestGrid from "./ForestGrid";

// Morning, afternoon or evening by the phone's own clock — the reference's
// "Good morning", which reads as the app noticing you rather than
// addressing a record.
function greetingKey() {
  const h = new Date().getHours();
  return h < 12 ? "goodMorning" : h < 18 ? "goodAfternoon" : "goodEvening";
}

export default function HomeScreen() {
  const { t } = useI18n();
  const { profile, interests, photos, entries } = useStore();
  const { dismissed } = useUI();
  // "Zoom out": one tree at a time, or the whole forest at once. Local state
  // rather than a saved preference — it's a way of looking, not a setting.
  const [zoomedOut, setZoomedOut] = useState(false);

  const due = dueNudges(interests, entries, dismissed);
  const memory = getResurfacedMemory(interests, photos, entries);
  const { streak, restingNow } = globalStreakDetail(entries, photos);

  // Only ever warn about one tree — whichever has least time left. A column
  // of near-identical warnings is noise, and the fix is per-tree anyway.
  const dying = interests
    .filter((it) => isDyingSoon(it, entries, photos))
    .sort((a, b) => daysUntilDeath(a, entries, photos) - daysUntilDeath(b, entries, photos))[0];

  return (
    <>
      <TopBar className="home-bar">
        {/* The app's mark where the reference has its logo, so the bar
            says where you are and the greeting can be the page's headline. */}
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20v-7" />
              <path d="M12 13c0-3.5 2.5-6 6-6 0 3.5-2.5 6-6 6z" />
              <path d="M12 15c0-3-2.2-5-5-5 0 3 2.2 5 5 5z" />
            </svg>
          </span>
          <span className="brand-name">Forest</span>
        </div>
        {interests.length > 0 && (
          <button
            type="button"
            className="chip zoom-btn"
            aria-pressed={zoomedOut ? "true" : "false"}
            aria-label={t(zoomedOut ? "zoomIn" : "zoomOut")}
            onClick={() => setZoomedOut((z) => !z)}
          >
            {zoomedOut ? "◱" : "▦"}
          </button>
        )}
        {/* number then flame, the order the Figma draws it in. Keyed on the
            value so the pop replays each time the streak actually moves. */}
        {/* the flame turns to a leaf while a rest day is holding the chain
            together, so a protected streak never looks like an unbroken one */}
        <span className={"chip flame-badge" + (restingNow ? " resting" : "")} title={restingNow ? t("restDayOn") : undefined}>
          {streak}
          <StreakFlame key={String(streak) + restingNow} resting={restingNow} />
        </span>
        <LangToggle />
      </TopBar>
      <div className="view home-view">
        <header className="page-head">
          <h1>{t(greetingKey()) + profile.name}</h1>
          <p className="page-sub">{t("homeSub")}</p>
        </header>
        {dying && <DyingBanner interest={dying} entries={entries} photos={photos} />}
        {due.length > 0 && <NudgeBanner interests={due} />}
        {memory && <MemoryBanner memory={memory} />}
        {zoomedOut
          ? <ForestGrid interests={interests} photos={photos} entries={entries} />
          : <OrbWall interests={interests} photos={photos} entries={entries} />}
      </div>
    </>
  );
}
