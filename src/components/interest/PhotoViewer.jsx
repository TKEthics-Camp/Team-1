import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { useObjectURL } from "../../lib/image";

export default function PhotoViewer() {
  const { t } = useI18n();
  const { photos, deletePhoto, updatePhotoCaption } = useStore();
  const { viewer, closeViewer, offerUndo } = useUI();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const photo = photos.find((x) => x.id === viewer);
  const url = useObjectURL(photo ? photo.blob : null);
  if (!photo) return null;

  function startEdit() {
    setDraft(photo.caption || "");
    setEditing(true);
  }
  function saveCaption() {
    updatePhotoCaption(photo.id, draft.trim());
    setEditing(false);
  }

  return (
    <div className="viewer">
      <img src={url} alt={photo.caption || ""} />
      {editing ? (
        <input
          autoFocus
          type="text"
          maxLength={80}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") saveCaption(); }}
          style={{ maxWidth: 260 }}
        />
      ) : (
        <button className="cap" style={{ background: "none", border: "none", cursor: "pointer" }} onClick={startEdit}>
          {photo.caption || t("captionAdd")}
        </button>
      )}
      {editing ? (
        <button className="btn2" style={{ maxWidth: 220 }} onClick={saveCaption}>{t("save")}</button>
      ) : (
        <button className="btn2" style={{ maxWidth: 220 }} onClick={closeViewer}>{t("close")}</button>
      )}
      <button
        className="btn2 btn-danger"
        style={{ maxWidth: 220 }}
        onClick={() => {
          const { restore, commit } = deletePhoto(photo.id);
          closeViewer();
          offerUndo(t("photoDeleted"), restore, commit);
        }}
      >
        {t("del")}
      </button>
    </div>
  );
}
