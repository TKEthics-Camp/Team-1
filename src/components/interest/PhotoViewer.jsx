import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { useObjectURL } from "../../lib/image";

export default function PhotoViewer() {
  const { t } = useI18n();
  const { photos, deletePhoto } = useStore();
  const { viewer, closeViewer } = useUI();

  const photo = photos.find((x) => x.id === viewer);
  const url = useObjectURL(photo ? photo.blob : null);
  if (!photo) return null;

  return (
    <div className="viewer">
      <img src={url} alt={photo.caption || ""} />
      {photo.caption && <div className="cap">{photo.caption}</div>}
      <button className="btn2" style={{ maxWidth: 220 }} onClick={closeViewer}>{t("close")}</button>
      <button
        className="btn2 btn-danger"
        style={{ maxWidth: 220 }}
        onClick={() => { deletePhoto(photo.id); closeViewer(); }}
      >
        {t("del")}
      </button>
    </div>
  );
}
