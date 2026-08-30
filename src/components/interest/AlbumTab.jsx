import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { usePhotoURL } from "../../lib/image";
import EmptyState from "../shared/EmptyState";

function PhotoThumb({ photo, onOpen, altFallback, cachePhotoBlob }) {
  const url = usePhotoURL(photo, cachePhotoBlob && ((blob) => cachePhotoBlob(photo.id, blob)));
  return (
    <button aria-label={photo.caption || altFallback} onClick={() => onOpen(photo.id)}>
      <img src={url} alt={photo.caption || ""} />
    </button>
  );
}

// `readOnly` is for someone else's album (see PublicInterestScreen) — there's
// nothing to cache back to for a photo that was never yours to store locally.
export default function AlbumTab({ photos, onOpenPhoto, readOnly = false }) {
  const { t } = useI18n();
  const { cachePhotoBlob } = useStore();
  if (!photos.length) return <EmptyState text={t("noPhotos")} />;
  return (
    <div className="photogrid">
      {photos.map((p) => (
        <PhotoThumb
          key={p.id}
          photo={p}
          onOpen={onOpenPhoto}
          altFallback={t("photos")}
          cachePhotoBlob={readOnly ? null : cachePhotoBlob}
        />
      ))}
    </div>
  );
}
