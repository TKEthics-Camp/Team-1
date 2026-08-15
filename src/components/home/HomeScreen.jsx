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
  const { profile, interests, photos, entries, removeDemoGarden } = useStore();
  const { dismissed } = useUI();

  // While a demo garden is planted, show only its trees — mixing 5 sample
  // trees in with someone's real ones (which might just be a lone sprout)
  // buries the point of the demo and clutters their actual garden. Removing
  // the demo garden (here or from Profile) brings the real ones straight back.
  // Entries/photos are filtered the same way: without this, the streak
  // badge, the resurfaced-memory banner, and reminder nudges all kept
  // leaking demo data (or deep-linking into a real tree hidden by the
  // banner above) even while every tree on screen was a sample one.
  const hasDemoGarden = interests.some((x) => x.isDemo);
  const shownInterests = hasDemoGarden ? interests.filter((x) => x.isDemo) : interests;
  const shownIds = hasDemoGarden ? new Set(shownInterests.map((x) => x.id)) : null;
  const shownEntries = hasDemoGarden ? entries.filter((e) => shownIds.has(e.interestId)) : entries;
  const shownPhotos = hasDemoGarden ? photos.filter((p) => shownIds.has(p.interestId)) : photos;

  const due = dueNudges(shownInterests, shownEntries, dismissed);
  const memory = getResurfacedMemory(shownInterests, shownPhotos, shownEntries);
  const streak = globalStreak(shownEntries, shownPhotos);
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
        {hasDemoGarden && (
          <div className="safe-note">
            <span aria-hidden="true">🌱</span>
            <span>{t("viewingDemoGarden")}</span>
            <button className="chip" style={{ marginLeft: "auto", flex: "none" }} onClick={removeDemoGarden}>
              {t("exitDemoGarden")}
            </button>
          </div>
        )}
        <OrbWall interests={shownInterests} photos={photos} entries={entries} />
      </div>
    </>
  );
}
