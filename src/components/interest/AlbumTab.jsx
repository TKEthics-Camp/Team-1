import { useI18n } from "../../i18n/I18nContext";
import { useObjectURL } from "../../lib/image";
import EmptyState from "../shared/EmptyState";

function PhotoThumb({ photo, onOpen, altFallback }) {
  const url = useObjectURL(photo.blob);
  return (
    <button aria-label={photo.caption || altFallback} onClick={() => onOpen(photo.id)}>
      <img src={url} alt={photo.caption || ""} />
    </button>
  );
}

export default function AlbumTab({ photos, onOpenPhoto }) {
  const { t } = useI18n();
  if (!photos.length) return <EmptyState text={t("noPhotos")} />;
  return (
    <div className="photogrid">
      {photos.map((p) => (
        <PhotoThumb key={p.id} photo={p} onOpen={onOpenPhoto} altFallback={t("photos")} />
      ))}
    </div>
  );
}
