import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { usePhotoURL } from "../../lib/image";
import { fmtDate, dateKey } from "../../lib/dates";
import Icon, { hobbyLook } from "../shared/Icon";

export default function InterestCover({ interest, firstPhoto }) {
  const { t, lang, nameOf } = useI18n();
  const { cachePhotoBlob } = useStore();
  // The cover is your own tree's pinned (or latest) photo — its bytes might
  // not be on this device yet (a fresh sign-in, a cache wipe), same as any
  // other synced photo, so this needs the fetch-capable hook (see
  // AlbumTab/PhotoViewer) instead of a local-blob-only one.
  const url = usePhotoURL(firstPhoto, firstPhoto && ((blob) => cachePhotoBlob(firstPhoto.id, blob)));

  // With no photo yet, a quiet grey panel carrying the hobby's own line icon
  // (a brush for Drawing, a ball for Basketball…), the same icon and colour
  // Explore uses for its category. A full-colour picture here was the
  // loudest thing on the page, and it is only a placeholder.
  const look = firstPhoto ? null : hobbyLook(interest.name);

  return (
    <div className={firstPhoto ? "cover" : "cover blank"} style={{ "--c": interest.color }}>
      {firstPhoto ? (
        <img src={url} alt={t("coverAlt")} />
      ) : (
        <span className={"cover-ico stat-ico tag-" + look.tone} aria-hidden="true">
          <Icon name={look.icon} size={26} />
        </span>
      )}
      <div className="veil" />
      <div className="cap">
        <div className="t">{nameOf(interest)}</div>
        <div className="s">
          {firstPhoto
            ? (firstPhoto.caption || fmtDate(dateKey(new Date(firstPhoto.createdAt)), lang))
            : t("firstPhoto")}
        </div>
      </div>
    </div>
  );
}
