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
import { useConsentStatus } from "../../lib/useConsentStatus";

const ALL_TABS = [
  ["ideas", "tabIdeas"],
  ["community", "tabCommunity"],
  ["school", "tabSchool"],
];

export default function ExploreScreen() {
  const { t } = useI18n();
  const { profile } = useStore();
  const { user } = useAuth();

  // An educator isn't a classmate and has their own roster already, on
  // their dashboard — School and Ideas (the solo hobby browser) are both
  // just for students, so an org account only ever sees Community.
  // Individuals keep Ideas, and gain School once they're in a class (their
  // own classCode — set via Me → Join a class).
  const isOrg = profile && profile.accountType === "org";
  const inClass = !!(profile && profile.classCode);

  // An account consented under the no-disclosure standard is shut out of
  // other people entirely, not just hidden from them: RLS returns nothing
  // for Community or user search, so showing either would be an empty tab
  // and a search box that never finds anybody. Ideas is a fixed local list
  // with no accounts in it, so it stays.
  const consent = useConsentStatus(user && user.id);
  const locked = !!(consent && consent.disclosure_locked);

  const TABS = ALL_TABS.filter(([key]) => {
    if (key === "ideas") return !isOrg;
    if (key === "school") return !isOrg && inClass && !locked;
    if (key === "community") return !locked;
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
        {user && !locked && <UserSearch />}
        <div className="tabs">
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
