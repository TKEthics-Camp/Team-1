import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { yearStats, demoStats } from "../../lib/yearReview";
import { fmtHours } from "../../lib/derived";
import Sheet from "../shared/Sheet";
import Mascot from "../shared/Mascot";
import Tree from "../shared/Tree";

// A Wrapped-style recap. There's no real time-lock in this app — yearStats()
// works off whatever's logged so far — but with little real data the real
// version looks thin, so "Try the demo" swaps in a rich sample data set
// instead, clearly labeled, so you can see the full experience today rather
// than waiting a year to fill it out for real.
export default function YearReviewSheet() {
  const { t, nameOf } = useI18n();
  const { interests, photos, entries } = useStore();
  const { closeSheet } = useUI();
  const [data, setData] = useState(null);
  const [i, setI] = useState(0);

  function cardsFor(d) {
    const cards = [
      { key: "hours", title: t("yrHoursTitle"), big: fmtHours(d.minutes), sub: t("yrHoursSub") },
      { key: "logged", title: t("yrLoggedTitle"), big: d.entryCount + d.photoCount, sub: t("yrLoggedSub") },
    ];
    if (d.top) {
      cards.push({ key: "top", title: t("yrTopTitle"), big: d.demo ? d.top.name : nameOf(d.top), sub: d.topCount + " " + t("yrTopSub") });
    }
    cards.push({ key: "streak", title: t("yrStreakTitle"), big: d.longestStreak, sub: t("yrStreakSub") });
    cards.push({ key: "planted", title: t("yrPlantedTitle"), big: d.planted, sub: t("yrPlantedSub") });
    return cards;
  }

  if (!data) {
    return (
      <Sheet onClose={closeSheet}>
        <div className="orb-sheet-preview"><Mascot size={72} /></div>
        <h2>{t("yearReview")}</h2>
        <p className="sub">{t("yearReviewIntro")}</p>
        <button className="btn" onClick={() => { setData(yearStats(interests, photos, entries)); setI(0); }}>
          {t("seeMyYear")}
        </button>
        <button className="btn2" onClick={() => { setData(demoStats()); setI(0); }}>
          {t("tryDemo")}
        </button>
        <button className="btn2" onClick={closeSheet}>{t("cancel")}</button>
      </Sheet>
    );
  }

  const cards = cardsFor(data);
  const last = i >= cards.length;

  return (
    <Sheet onClose={closeSheet}>
      {data.demo && <div className="sub demo-note">{t("demoBadge")}</div>}
      {!last ? (
        <div className="year-card">
          <div className="label">{cards[i].title}</div>
          <div className="year-big">{cards[i].big}</div>
          <div className="sub">{cards[i].sub}</div>
        </div>
      ) : (
        <div className="year-card">
          <Tree interest={{ color: "#6EE7A8" }} size={100} stage={4} health="healthy" className="alive" />
          <div className="label">{t("yrFinalTitle")}</div>
          <div className="sub">{t("yrFinalSub")}</div>
        </div>
      )}
      <div className="tree-dots">
        {cards.map((_, idx) => <span key={idx} className={"dot" + (idx === i ? " on" : "")} />)}
        <span className={"dot" + (last ? " on" : "")} />
      </div>
      {!last ? (
        <button className="btn" onClick={() => setI((n) => n + 1)}>{t("next")}</button>
      ) : (
        <button className="btn" onClick={closeSheet}>{t("close")}</button>
      )}
    </Sheet>
  );
}
