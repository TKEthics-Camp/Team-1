import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { uid } from "../../lib/id";
import { downscale, useObjectURL } from "../../lib/image";
import Sheet from "../shared/Sheet";
import Field from "../shared/Field";
import Chip from "../shared/Chip";
import VisRow from "../shared/VisRow";

export default function PhotoSheet({ interestId }) {
  const { t, nameOf } = useI18n();
  const { interests, addPhoto } = useStore();
  const { closeSheet } = useUI();
  const navigate = useNavigate();
  const it = interests.find((x) => x.id === interestId);

  const fileRef = useRef(null);
  const [blob, setBlob] = useState(null);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [pinned, setPinned] = useState(false);
  const previewUrl = useObjectURL(blob);

  if (!it) return null;

  function onFileChange(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    downscale(f, 1600, (out) => setBlob(out));
  }

  function save() {
    if (!blob) return;
    const rec = {
      id: uid(), interestId: it.id, blob, caption: caption.trim(),
      visibility, isPinned: pinned, createdAt: Date.now(),
    };
    addPhoto(rec);
    closeSheet();
    navigate(`/saved/${it.id}`);
  }

  return (
    <Sheet onClose={closeSheet}>
      <h2>{t("addPhoto") + " · " + nameOf(it)}</h2>
      <button className="btn2" onClick={() => fileRef.current?.click()}>{t("choosePhoto")}</button>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFileChange} />
      {blob && <img src={previewUrl} alt="" style={{ maxWidth: 150, borderRadius: 12 }} />}
      <Field label={t("caption")}>
        <input
          type="text"
          placeholder={t("captionPh")}
          maxLength={80}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
      </Field>
      <VisRow value={visibility} onChange={setVisibility} />
      <div className="chips">
        <Chip pressed={pinned} onClick={() => setPinned((p) => !p)}>
          {(pinned ? "★ " : "☆ ") + t("pin")}
        </Chip>
      </div>
      <button className="btn" disabled={!blob} onClick={save}>{t("save")}</button>
      <button className="btn2" onClick={closeSheet}>{t("cancel")}</button>
    </Sheet>
  );
}
