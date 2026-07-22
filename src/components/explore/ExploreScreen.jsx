import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import IdeasTab from "./IdeasTab";
import CommunityTab from "./CommunityTab";
import SchoolTab from "./SchoolTab";

const TABS = [
  ["ideas", "tabIdeas"],
  ["community", "tabCommunity"],
  ["school", "tabSchool"],
];

export default function ExploreScreen() {
  const { t } = useI18n();
  const [tab, setTab] = useState("ideas");

  return (
    <>
      <TopBar>
        <h1>{t("explore")}</h1>
        <LangToggle />
      </TopBar>
      <div className="view">
        <div className="tabs">
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
