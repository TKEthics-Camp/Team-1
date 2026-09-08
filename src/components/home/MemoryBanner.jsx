import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { usePhotoURL } from "../../lib/image";
import { fmtDate } from "../../lib/dates";
import Tree from "../shared/Tree";

export default function MemoryBanner({ memory }) {
  const { t, lang, nameOf } = useI18n();
  const { cachePhotoBlob } = useStore();
  const navigate = useNavigate();
  // A memory's photo might not have its bytes on this device yet (a fresh
  // sign-in, a cache wipe) — usePhotoURL falls back to fetching it from
  // Storage instead of silently showing the tree icon for a photo that's
  // actually there. isPhoto (not just memory.blob) is what a photo memory
  // is, so a not-yet-downloaded one still gets treated as one.
  const isPhoto = !!(memory.blob || memory.storagePath);
  const photoUrl = usePhotoURL(memory, cachePhotoBlob && ((blob) => cachePhotoBlob(memory.id, blob)));

  return (
    <button
      className="memory"
      onClick={() => navigate(`/interest/${memory.interest.id}?tab=${isPhoto ? "album" : "journal"}`)}
    >
      {isPhoto ? (
        <img src={photoUrl} alt="" />
      ) : (
        <div style={{ flex: "none" }}><Tree interest={memory.interest} size={54} stage={3} health="healthy" /></div>
      )}
      <div className="body">
        <span className="kicker">
          {memory.quietDays ? t("quietDays").replace("{n}", memory.quietDays) : t("remember")}
        </span>
        <div className="text">{memory.text || nameOf(memory.interest)}</div>
        <div className="when">
          {nameOf(memory.interest) + " · " + (memory.quietDays ? t("quietSub") : fmtDate(memory.date, lang))}
        </div>
      </div>
    </button>
  );
}
