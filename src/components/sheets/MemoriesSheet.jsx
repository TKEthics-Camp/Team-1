import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { useObjectURL } from "../../lib/image";
import { fmtDate } from "../../lib/dates";
import { onThisDay, categoryReels, categoryLabel } from "../../lib/memories";
import Sheet from "../shared/Sheet";
import Tree from "../shared/Tree";

function MemoryRow({ item, sub, onOpen }) {
  const { nameOf } = useI18n();
  const url = useObjectURL(item.blob);
  return (
    <button className="memory-row" onClick={onOpen}>
      {item.blob ? (
        <img src={url} alt="" />
      ) : (
        <div style={{ flex: "none" }}><Tree interest={item.interest} size={40} stage={2} health="healthy" /></div>
      )}
      <div className="body">
        <div className="text">{item.text || nameOf(item.interest)}</div>
        <div className="when">{nameOf(item.interest) + " · " + sub}</div>
      </div>
    </button>
  );
}

// A small "Memories" browser, Apple-Photos-style: an On This Day reel of
// anything logged on this exact date in a past year, plus smart reels
// pooled by category (Sport, Art, ...) across every hobby that shares one —
// so "look back at your exercise" isn't limited to a single tree.
export default function MemoriesSheet() {
  const { t, lang } = useI18n();
  const { interests, photos, entries } = useStore();
  const { closeSheet } = useUI();
  const navigate = useNavigate();

  const otd = onThisDay(interests, photos, entries);
  const reels = categoryReels(interests, photos, entries);

  function open(item) {
    navigate(`/interest/${item.interest.id}?tab=${item.blob ? "album" : "journal"}`);
    closeSheet();
  }

  return (
    <Sheet onClose={closeSheet}>
      <h2>{t("memories")}</h2>

      <div className="scroll">
        {otd.length > 0 && (
          <>
            <div className="label">{t("onThisDay")}</div>
            {otd.map((item, i) => (
              <MemoryRow
                key={"otd" + i}
                item={item}
                sub={item.yearsAgo === 1 ? t("yearAgo") : t("yearsAgo").replace("{n}", item.yearsAgo)}
                onOpen={() => open(item)}
              />
            ))}
          </>
        )}

        {reels.map((reel) => (
          <div key={reel.cat}>
            <div className="label">{categoryLabel(reel.cat, lang)}</div>
            {reel.items.slice(0, 6).map((item, i) => (
              <MemoryRow key={reel.cat + i} item={item} sub={fmtDate(item.date, lang)} onOpen={() => open(item)} />
            ))}
          </div>
        ))}

        {otd.length === 0 && reels.length === 0 && (
          <div className="sub">{t("memoriesEmpty")}</div>
        )}
      </div>

      <button className="btn2" onClick={closeSheet}>{t("close")}</button>
    </Sheet>
  );
}
