import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useAuth } from "../../store/AuthContext";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import IdeasTab from "./IdeasTab";
import CommunityTab from "./CommunityTab";
import SchoolTab from "./SchoolTab";
import UserSearch from "./UserSearch";

const ALL_TABS = [
  ["ideas", "tabIdeas"],
  ["community", "tabCommunity"],
  ["school", "tabSchool"],
];

export default function ExploreScreen() {
  const { t } = useI18n();
  const { profile } = useStore();
  const { user } = useAuth();

  // Org accounts get the classmate web but not the solo idea browser;
  // everyone else keeps Ideas, and gains School once they're in a class
  // (their own classCode — set at org onboarding or via Me → Join a class).
  const isOrg = profile && profile.accountType === "org";
  const inClass = !!(profile && profile.classCode);
  const TABS = ALL_TABS.filter(([key]) => {
    if (key === "ideas") return !isOrg;
    if (key === "school") return isOrg || inClass;
    return true;
  });

  const [tab, setTab] = useState(TABS[0][0]);
  // If the tab list changes while mounted (e.g. accountType/classCode flips),
  // a stale selection could name a tab that no longer exists — fall back.
  const activeTab = TABS.some(([key]) => key === tab) ? tab : TABS[0][0];

  return (
    <>
      <TopBar>
        <h1>{t("explore")}</h1>
        <LangToggle />
      </TopBar>
      <div className="view">
        {user && <UserSearch />}
        <div className="tabs" data-tour="exploreTabs">
          {TABS.map(([key, label]) => (
            <button key={key} aria-selected={activeTab === key} onClick={() => setTab(key)}>
              {t(label)}
            </button>
          ))}
        </div>

        <div className="scroll">
          {activeTab === "ideas" && <IdeasTab />}
          {activeTab === "community" && <CommunityTab />}
          {activeTab === "school" && <SchoolTab />}
        </div>
      </div>
    </>
  );
}
