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

  // Educator accounts (accountType "org", set only via onboarding's "school
  // or group" path) don't browse hobby ideas for themselves — they get the
  // classmate web instead. Everyone else keeps Ideas, and gets School too
  // the moment they're in a class (classCode set), whether that's an
  // individual who joined one later or the educator who created it — see
  // JoinClassSheet, which deliberately never touches accountType.
  const isOrg = profile && profile.accountType === "org";
  const inClass = !!(profile && profile.classCode);
  const TABS = ALL_TABS.filter(([key]) => {
    if (key === "ideas") return !isOrg;
    if (key === "school") return isOrg || inClass;
    return true;
  });

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
