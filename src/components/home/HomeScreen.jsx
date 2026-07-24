import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { dueNudges } from "../../lib/reminders";
import { getResurfacedMemory } from "../../lib/resurfaced";
import { globalStreak } from "../../lib/derived";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import NudgeBanner from "./NudgeBanner";
import MemoryBanner from "./MemoryBanner";
import DemoGardenCard from "./DemoGardenCard";
import OrbWall from "./OrbWall";

export default function HomeScreen() {
  const { t } = useI18n();
  const { profile, interests, photos, entries } = useStore();
  const { dismissed } = useUI();

  const due = dueNudges(interests, entries, dismissed);
  const memory = getResurfacedMemory(interests, photos, entries);
  const streak = globalStreak(entries, photos);
  // The barren first-run state — right after onboarding a judge has a
  // handful of sprouts (onboarding's suggestion chips make it easy to add
  // several) but nothing logged yet. Offer the sample garden here, where it
  // matters most; it vanishes the moment there's any real activity. Hidden
  // during the guided tour so Sprig (the tour mascot) and the card's own
  // mascot don't end up overlapping on screen at once.
  const barren = entries.length === 0 && photos.length === 0 && profile.tourSeen;

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
        {barren && <DemoGardenCard />}
        <OrbWall interests={interests} photos={photos} entries={entries} />
      </div>
    </>
  );
}
