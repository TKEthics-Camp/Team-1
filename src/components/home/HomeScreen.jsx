import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { dueNudges } from "../../lib/reminders";
import { getResurfacedMemory } from "../../lib/resurfaced";
import { globalStreak } from "../../lib/derived";
import { isDyingSoon, daysUntilDeath } from "../../lib/tree";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import NudgeBanner from "./NudgeBanner";
import MemoryBanner from "./MemoryBanner";
import DyingBanner from "./DyingBanner";
import OrbWall from "./OrbWall";
import ForestGrid from "./ForestGrid";

export default function HomeScreen() {
  const { t } = useI18n();
  const { profile, interests, photos, entries } = useStore();
  const { dismissed } = useUI();
  // "Zoom out": one tree at a time, or the whole forest at once. Local state
  // rather than a saved preference — it's a way of looking, not a setting.
  const [zoomedOut, setZoomedOut] = useState(false);

  const due = dueNudges(interests, entries, dismissed);
  const memory = getResurfacedMemory(interests, photos, entries);
  const streak = globalStreak(entries, photos);

  // Only ever warn about one tree — whichever has least time left. A column
  // of near-identical warnings is noise, and the fix is per-tree anyway.
  const dying = interests
    .filter((it) => isDyingSoon(it, entries, photos))
    .sort((a, b) => daysUntilDeath(a, entries, photos) - daysUntilDeath(b, entries, photos))[0];

  return (
    <>
      <TopBar className="home-bar">
        <h1>{t("hi") + profile.name}</h1>
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
        <span className="chip flame-badge">
          {streak}
          <span key={streak} className="flame" aria-hidden="true">🔥</span>
        </span>
        <LangToggle />
      </TopBar>
      <div className="view home-view">
        {dying && <DyingBanner interest={dying} entries={entries} photos={photos} />}
        {due.length > 0 && <NudgeBanner interest={due[0]} />}
        {memory && <MemoryBanner memory={memory} />}
        {zoomedOut
          ? <ForestGrid interests={interests} photos={photos} entries={entries} />
          : <OrbWall interests={interests} photos={photos} entries={entries} />}
      </div>
    </>
  );
}
