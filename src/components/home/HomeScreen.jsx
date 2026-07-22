import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { dueNudges } from "../../lib/reminders";
import { getResurfacedMemory } from "../../lib/resurfaced";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import EmptyState from "../shared/EmptyState";
import NudgeBanner from "./NudgeBanner";
import MemoryBanner from "./MemoryBanner";
import OrbWall from "./OrbWall";

export default function HomeScreen() {
  const { t } = useI18n();
  const { profile, interests, photos, entries } = useStore();
  const { dismissed } = useUI();

  const due = dueNudges(interests, entries, dismissed);
  const memory = getResurfacedMemory(interests, photos, entries);

  return (
    <>
      <TopBar>
        <h1>{t("hi") + profile.name}</h1>
        <LangToggle />
      </TopBar>
      <div className="view">
        {due.length > 0 && <NudgeBanner interest={due[0]} />}
        {memory && <MemoryBanner memory={memory} />}
        <div className="scroll">
          <OrbWall interests={interests} photos={photos} entries={entries} />
          {!interests.length && <EmptyState text={t("emptyHome")} />}
        </div>
      </div>
    </>
  );
}
