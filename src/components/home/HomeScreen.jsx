import { Plus } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { dueNudges } from "../../lib/reminders";
import { getResurfacedMemory } from "../../lib/resurfaced";
import { getGreeting } from "../../lib/greeting";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import EmptyState from "../shared/EmptyState";
import NudgeBanner from "./NudgeBanner";
import MemoryBanner from "./MemoryBanner";
import OrbWall from "./OrbWall";

const GREETING_KEYS = { morning: "greetingMorning", afternoon: "greetingAfternoon", evening: "greetingEvening" };

export default function HomeScreen() {
  const { t } = useI18n();
  const { profile, interests, photos, entries } = useStore();
  const { dismissed, openSheet } = useUI();

  const due = dueNudges(interests, entries, dismissed);
  const memory = getResurfacedMemory(interests, photos, entries);
  const greetingKey = GREETING_KEYS[getGreeting()];

  return (
    <>
      <TopBar>
        <span className="eyebrow">{t("appName")}</span>
        <LangToggle />
      </TopBar>
      <div className="view">
        <h1 className="greeting">{t(greetingKey) + profile.name}</h1>
        {due.length > 0 && <NudgeBanner interest={due[0]} />}
        {memory && <MemoryBanner memory={memory} />}
        <div className="scroll">
          <div className="section-label">{t("yourOrbs")}</div>
          <OrbWall interests={interests} photos={photos} />
          {!interests.length && <EmptyState text={t("emptyHome")} />}
          <button className="btn2 accent" onClick={() => openSheet("orb")}>
            <Plus size={16} strokeWidth={2.5} />
            {t("newInterest")}
          </button>
        </div>
      </div>
    </>
  );
}
