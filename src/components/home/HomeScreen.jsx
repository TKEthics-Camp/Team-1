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
      <TopBar className="home-bar">
        <h1>{t("hi") + profile.name}</h1>
        {/* number then flame, the order the Figma draws it in */}
        <span className="chip flame-badge">{streak + " 🔥"}</span>
        <LangToggle />
      </TopBar>
      <div className="view home-view">
        {due.length > 0 && <NudgeBanner interest={due[0]} />}
        {memory && <MemoryBanner memory={memory} />}
        <OrbWall interests={interests} photos={photos} entries={entries} />
      </div>
    </>
  );
}
