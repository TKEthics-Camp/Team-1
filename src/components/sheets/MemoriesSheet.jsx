import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { usePhotoURL } from "../../lib/image";
import { fmtDate } from "../../lib/dates";
import { onThisDay, categoryReels, categoryLabel } from "../../lib/memories";
import Sheet from "../shared/Sheet";
import Icon, { hobbyLook } from "../shared/Icon";

// isPhoto, not item.blob, is what makes something a photo memory — a photo
// might only have a storagePath on this device yet (a fresh sign-in, a
// cache wipe), and usePhotoURL (unlike the old local-blob-only
// useObjectURL) fetches from Storage in that case instead of leaving it
// looking like a plain journal entry.
function isPhotoMemory(item) {
  return !!(item.blob || item.storagePath);
}

function MemoryRow({ item, sub, onOpen, cachePhotoBlob }) {
  const { nameOf } = useI18n();
  const url = usePhotoURL(item, cachePhotoBlob && ((blob) => cachePhotoBlob(item.id, blob)));
  const look = hobbyLook(item.interest.name);
  return (
    <button className="memory-row" onClick={onOpen}>
      {/* A photo shows itself; words get their hobby's icon, the same one
          its tree card and Explore use. */}
      {isPhotoMemory(item) ? (
        <img src={url} alt="" />
      ) : (
        <span className={"idea-ico stat-ico tag-" + look.tone} aria-hidden="true">
          <Icon name={look.icon} size={18} />
        </span>
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
  const { interests, photos, entries, cachePhotoBlob } = useStore();
  const { closeSheet } = useUI();
  const navigate = useNavigate();

  const otd = onThisDay(interests, photos, entries);
  const reels = categoryReels(interests, photos, entries);

  function open(item) {
    navigate(`/interest/${item.interest.id}?tab=${isPhotoMemory(item) ? "album" : "journal"}`);
    closeSheet();
  }

  return (
    <Sheet onClose={closeSheet}>
      <h2>{t("memories")}</h2>

      <div className="scroll">
        {otd.length > 0 && (
          <>
            <div className="label">{t("onThisDay")}</div>
            <div className="memory-group">
              {otd.map((item, i) => (
                <MemoryRow
                  key={"otd" + i}
                  item={item}
                  sub={item.yearsAgo === 1 ? t("yearAgo") : t("yearsAgo").replace("{n}", item.yearsAgo)}
                  onOpen={() => open(item)}
                  cachePhotoBlob={cachePhotoBlob}
                />
              ))}
            </div>
          </>
        )}

        {reels.map((reel) => (
          <div key={reel.cat}>
            <div className="label">{categoryLabel(reel.cat, lang)}</div>
            <div className="memory-group">
              {reel.items.slice(0, 6).map((item, i) => (
                <MemoryRow key={reel.cat + i} item={item} sub={fmtDate(item.date, lang)} onOpen={() => open(item)} cachePhotoBlob={cachePhotoBlob} />
              ))}
            </div>
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
