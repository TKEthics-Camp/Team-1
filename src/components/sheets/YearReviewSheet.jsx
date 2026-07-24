import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { yearStats, demoStats } from "../../lib/yearReview";
import { fmtHours } from "../../lib/derived";
import Mascot from "../shared/Mascot";
import Tree from "../shared/Tree";

// A Wrapped-style recap, full screen and story-paced (tap to advance, a
// segmented progress bar up top) rather than a small bottom sheet. There's
// no real time-lock in this app — yearStats() works off whatever's logged
// so far — but with little real data the real version looks thin, so "Try
// the demo" swaps in a rich sample data set instead, clearly labeled, so
// you can see the full experience today rather than waiting a year to fill
// it out for real.
export default function YearReviewSheet() {
  const { t, nameOf } = useI18n();
  const { interests, photos, entries } = useStore();
  const { closeSheet } = useUI();
  const [data, setData] = useState(null);
  const [i, setI] = useState(0);

  function cardsFor(d) {
    const cards = [
      { key: "hours", title: t("yrHoursTitle"), big: fmtHours(d.minutes), sub: t("yrHoursSub"), emoji: "⏱️" },
      { key: "logged", title: t("yrLoggedTitle"), big: d.entryCount + d.photoCount, sub: t("yrLoggedSub"), emoji: "📸" },
    ];
    if (d.top) {
      cards.push({
        key: "top", title: t("yrTopTitle"), big: d.demo ? d.top.name : nameOf(d.top),
        sub: d.topCount + " " + t("yrTopSub"), emoji: "🏆", tree: d.top,
      });
    }
    cards.push({ key: "streak", title: t("yrStreakTitle"), big: d.longestStreak, sub: t("yrStreakSub"), emoji: "🔥" });
    cards.push({ key: "planted", title: t("yrPlantedTitle"), big: d.planted, sub: t("yrPlantedSub"), emoji: "🌱" });
    cards.push({ key: "trees", title: t("yrTreesTitle"), big: d.totalTrees, sub: t("yrTreesSub"), emoji: "🌳" });
    return cards;
  }

  function close() {
    setData(null);
    closeSheet();
  }

  if (!data) {
    return (
      <div className="year-full">
        <button className="year-close" aria-label={t("close")} onClick={closeSheet}>✕</button>
        <div className="year-intro">
          <Mascot size={72} />
          <h2>{t("yearReview")}</h2>
          <p className="sub">{t("yearReviewIntro")}</p>
          <button className="btn" onClick={() => { setData(yearStats(interests, photos, entries)); setI(0); }}>
            {t("seeMyYear")}
          </button>
          <button className="btn2" onClick={() => { setData(demoStats()); setI(0); }}>
            {t("tryDemo")}
          </button>
        </div>
      </div>
    );
  }

  const cards = cardsFor(data);
  const last = i >= cards.length;
  const stepCount = cards.length + 1;

  function next() {
    if (last) { close(); return; }
    setI((n) => n + 1);
  }

  return (
    <div className="year-full" onClick={next} role="button" tabIndex={0}>
      <button className="year-close" aria-label={t("close")} onClick={(e) => { e.stopPropagation(); close(); }}>✕</button>
      <div className="year-progress">
        {Array.from({ length: stepCount }).map((_, idx) => (
          <span key={idx} className={"seg" + (idx < i ? " done" : idx === i ? " on" : "")} />
        ))}
      </div>
      {data.demo && <div className="sub demo-note year-demo-note">{t("demoBadge")}</div>}
      {!last ? (
        <div className="year-card year-card-full">
          <div className="year-emoji" aria-hidden="true">{cards[i].emoji}</div>
          <div className="label">{cards[i].title}</div>
          <div className="year-big">{cards[i].big}</div>
          <div className="sub">{cards[i].sub}</div>
          {cards[i].tree && (
            <Tree
              interest={data.demo ? { color: cards[i].tree.color } : cards[i].tree}
              size={120} stage={4} health="healthy" className="alive"
            />
          )}
        </div>
      ) : (
        <div className="year-card year-card-full">
          <Tree interest={{ color: "#6EE7A8" }} size={140} stage={4} health="healthy" className="alive" />
          <div className="label">{t("yrFinalTitle")}</div>
          <div className="sub">{t("yrFinalSub")}</div>
        </div>
      )}
      <button className="btn year-next" onClick={(e) => { e.stopPropagation(); next(); }}>
        {last ? t("close") : t("next")}
      </button>
    </div>
  );
}
