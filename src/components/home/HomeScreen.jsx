import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { dueNudges } from "../../lib/reminders";
import { getResurfacedMemory } from "../../lib/resurfaced";
import { globalStreak } from "../../lib/derived";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import EmptyState from "../shared/EmptyState";
import MascotTour from "../shared/MascotTour";
import NudgeBanner from "./NudgeBanner";
import MemoryBanner from "./MemoryBanner";
import OrbWall from "./OrbWall";

export default function HomeScreen() {
  const { t } = useI18n();
  const { profile, interests, photos, entries } = useStore();
  const { dismissed } = useUI();

  const due = dueNudges(interests, entries, dismissed);
  const memory = getResurfacedMemory(interests, photos, entries);
  const streak = globalStreak(entries, photos);

  return (
    <>
      <TopBar>
        <h1>{t("hi") + profile.name}</h1>
        <span className="chip flame-badge" data-tour="streak">{"🔥 " + streak}</span>
        <LangToggle />
      </TopBar>
      <div className="view">
        {due.length > 0 && <NudgeBanner interest={due[0]} />}
        {memory && <MemoryBanner memory={memory} />}
        {interests.length ? (
          <OrbWall interests={interests} photos={photos} entries={entries} />
        ) : (
          <div className="scroll"><EmptyState text={t("emptyHome")} /></div>
        )}
      </div>
      {profile && !profile.tourSeen && <MascotTour />}
    </>
  );
}
