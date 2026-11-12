import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { usePhotoURL } from "../../lib/image";
import { fmtDate, dateKey } from "../../lib/dates";

// The photo at the top of a tree's page: the pinned one, otherwise the first
// ever added. Only drawn once there is a photo — until then the tree itself
// is the page's picture (see InterestScreen).
export default function InterestCover({ interest, firstPhoto }) {
  const { t, lang, nameOf } = useI18n();
  const { cachePhotoBlob } = useStore();
  // Its bytes might not be on this device yet (a fresh sign-in, a cache
  // wipe), same as any other synced photo, so this needs the fetch-capable
  // hook (see AlbumTab/PhotoViewer) instead of a local-blob-only one.
  const url = usePhotoURL(firstPhoto, (blob) => cachePhotoBlob(firstPhoto.id, blob));

  return (
    <div className="cover" style={{ "--c": interest.color }}>
      <img src={url} alt={t("coverAlt")} />
      <div className="veil" />
      <div className="cap">
        <div className="t">{nameOf(interest)}</div>
        <div className="s">{firstPhoto.caption || fmtDate(dateKey(new Date(firstPhoto.createdAt)), lang)}</div>
      </div>
    </div>
  );
}
