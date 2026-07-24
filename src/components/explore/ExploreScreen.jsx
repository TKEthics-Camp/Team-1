import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import IdeasTab from "./IdeasTab";
import CommunityTab from "./CommunityTab";
import SchoolTab from "./SchoolTab";

const ALL_TABS = [
  ["ideas", "tabIdeas"],
  ["community", "tabCommunity"],
  ["school", "tabSchool"],
];

export default function ExploreScreen() {
  const { t } = useI18n();
  const { profile } = useStore();

  // Organisations get the classmate web but not the solo idea browser;
  // individuals get ideas but no school. Community is shared by both.
  const isOrg = profile && profile.accountType === "org";
  const TABS = ALL_TABS.filter(([key]) => (isOrg ? key !== "ideas" : key !== "school"));

  const [tab, setTab] = useState(TABS[0][0]);

  return (
    <>
      <TopBar>
        <h1>{t("explore")}</h1>
        <LangToggle />
      </TopBar>
      <div className="view">
        <div className="tabs" data-tour="exploreTabs">
          {TABS.map(([key, label]) => (
            <button key={key} aria-selected={tab === key} onClick={() => setTab(key)}>
              {t(label)}
            </button>
          ))}
        </div>

        <div className="scroll">
          {tab === "ideas" && <IdeasTab />}
          {tab === "community" && <CommunityTab />}
          {tab === "school" && <SchoolTab />}
        </div>
      </div>
    </>
  );
}
