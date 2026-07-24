import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { pullPublicProfile } from "../../lib/remote";
import { entriesOf, minutesOf, fmtHours } from "../../lib/derived";
import { treeStage, treeHealth, daysPlanted, STAGE_KEY, HEALTH_KEY } from "../../lib/tree";
import TopBar from "../shared/TopBar";
import Stats from "../shared/Stats";
import Tree from "../shared/Tree";
import JournalTab from "./JournalTab";

// Someone else's orb, opened from a search result (see UserProfileSheet).
// Look-only: no add/edit/delete anywhere, and no album — photos are still
// local-only (never synced), so there's nothing remote to show for one yet.
export default function PublicInterestScreen() {
  const { userId, interestId } = useParams();
  const navigate = useNavigate();
  const { t, nameOf, nOf } = useI18n();
  const [state, setState] = useState({ loading: true, interests: [], entries: [] });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, interests: [], entries: [] });
    pullPublicProfile(userId).then(({ interests, entries }) => {
      if (!cancelled) setState({ loading: false, interests, entries });
    });
    return () => { cancelled = true; };
  }, [userId]);

  const { loading, interests, entries } = state;
  const it = interests.find((x) => x.id === interestId);

  useEffect(() => {
    if (!loading && !it) navigate("/explore", { replace: true });
  }, [loading, it, navigate]);

  if (loading || !it) return null;

  const en = entriesOf(entries, it.id);
  const minutes = minutesOf(entries, it.id);
  const stage = treeStage(it, entries, []);
  const health = treeHealth(it, entries, []);
  const planted = daysPlanted(it);

  return (
    <>
      <TopBar>
        <button className="icon" aria-label={t("home")} onClick={() => navigate(-1)}>←</button>
        <h1>{nameOf(it)}</h1>
        <span className="sub">{t("viewOnly")}</span>
      </TopBar>
      <div className="view">
        <div className="planted-label center-label">
          {planted === 0 ? t("plantedToday") : t("plantedDays").replace("{n}", planted)}
        </div>

        <div className={"tree-status" + (health === "dead" ? " dead" : "")}>
          <Tree interest={it} size={84} stage={stage} health={health} />
          <div className="info">
            <div className="st-stage">{t(STAGE_KEY[stage])}</div>
            <div className="st-health">{t(HEALTH_KEY[health])}</div>
          </div>
        </div>

        <Stats items={[
          { n: fmtHours(minutes), k: t("hours") },
          { n: en.length, k: nOf(en.length, "entries") },
        ]} />

        {it.why && <div className="sub">{`“${it.why}”`}</div>}

        <div className="label">{t("journal")}</div>
        <div className="tab-content">
          <JournalTab entries={en} readOnly />
        </div>
      </div>
    </>
  );
}
