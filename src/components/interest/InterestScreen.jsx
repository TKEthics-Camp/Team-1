import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { daysSincePlanted } from "../../lib/derived";
import { treeStage, treeHealth, actsToNextStage, STAGE_KEY, HEALTH_KEY, REVIVE_COST } from "../../lib/tree";
import { speciesOf } from "../../lib/species";
import TopBar from "../shared/TopBar";
import Tree from "../shared/Tree";

// A hobby's home: just its tree, standing on its own, with how long ago it
// was planted shown right at the top (the one streak that matters lives on
// the Me page now, shared across every hobby). Photos and journal entries
// live one tap deeper, on the entries page.
export default function InterestScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang, nameOf, nOf } = useI18n();
  const { interests, photos, entries, profile, reviveInterest } = useStore();
  const { openSheet } = useUI();
  const [reviving, setReviving] = useState(false);

  const it = interests.find((x) => x.id === id);

  useEffect(() => {
    if (!it) navigate("/", { replace: true });
  }, [it, navigate]);

  if (!it) return null;

  const planted = daysSincePlanted(it);
  const stage = treeStage(it, entries, photos);
  const health = treeHealth(it, entries, photos);
  const species = speciesOf(it.species);
  const toNext = actsToNextStage(it, entries, photos);
  const coins = (profile && profile.coins) || 0;
  const canRevive = coins >= REVIVE_COST;

  function revive() {
    reviveInterest(it.id);
    setReviving(true);
    setTimeout(() => setReviving(false), 1400);
  }

  return (
    <>
      <TopBar>
        <button className="icon" aria-label={t("home")} onClick={() => navigate("/")}>←</button>
        <h1>{nameOf(it)}</h1>
        <button className="icon" aria-label={t("editOrb")} onClick={() => openSheet("orb", it.id)}>⋯</button>
      </TopBar>
      <div className="view tree-page">
        <div className="streak-pill" aria-label={`${planted} ${t("plantedDays")}`}>
          <span className="flame" aria-hidden="true">🌱</span>
          <span>{planted} {nOf(planted, "plantedDays")}</span>
        </div>

        <div className={"tree-stage-wrap" + (reviving ? " reviving" : "")}>
          <Tree interest={it} size={220} stage={stage} health={health} className="tree-hero" />
        </div>

        <div className={"tree-status solo" + (health === "dead" ? " dead" : "")}>
          <div className="info">
            <div className="st-stage">{t(STAGE_KEY[stage])}</div>
            <div className="st-species">{t("speciesLabel")}: {species.name[lang === "en" ? 0 : 1]}</div>
            <div className="st-health">{t(HEALTH_KEY[health])}</div>
            {health === "dead" ? (
              <div className="st-note">{canRevive ? t("reviveHint") : t("reviveNeed").replace("{n}", REVIVE_COST)}</div>
            ) : toNext !== null ? (
              <div className="st-note">{t("growProgress").replace("{n}", toNext)}</div>
            ) : (
              <div className="st-note">{t("fullyGrown")}</div>
            )}
          </div>
        </div>

        {health === "dead" && (
          <button
            className="btn revive-btn"
            disabled={!canRevive}
            onClick={revive}
          >
            {t("reviveBtn").replace("{n}", REVIVE_COST)}
          </button>
        )}

        <button className="btn tree-cta" onClick={() => navigate(`/interest/${it.id}/entries`)}>
          {t("viewEntries")}
        </button>
      </div>
    </>
  );
}
