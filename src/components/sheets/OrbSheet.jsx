import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { uid } from "../../lib/id";
import { PALETTE } from "../../lib/constants";
import Sheet from "../shared/Sheet";
import Field from "../shared/Field";

export default function OrbSheet({ interestId }) {
  const { t } = useI18n();
  const { interests, addInterest, updateInterest, deleteInterest } = useStore();
  const { closeSheet } = useUI();
  const navigate = useNavigate();

  const editing = interestId ? interests.find((x) => x.id === interestId) : null;

  const [name, setName] = useState(editing ? editing.name : "");
  const [why, setWhy] = useState(editing ? editing.why || "" : "");
  const [color, setColor] = useState(editing ? editing.color : PALETTE[interests.length % PALETTE.length]);
  const [time, setTime] = useState(editing ? editing.time || "16:00" : "16:00");
  const [friendsText, setFriendsText] = useState(editing ? (editing.friends || []).join(", ") : "");
  const nameRef = useRef(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  function save() {
    const nm = name.trim();
    if (!nm) { nameRef.current?.focus(); return; }
    const friends = friendsText.split(/[,，]/).map((x) => x.trim()).filter(Boolean);
    if (editing) {
      updateInterest({ ...editing, name: nm, why: why.trim(), color, time, friends, updatedAt: Date.now() });
    } else {
      addInterest({
        id: uid(), name: nm, why: why.trim(), color, time, friends,
        createdAt: Date.now(), updatedAt: Date.now(),
      });
    }
    closeSheet();
  }

  function remove() {
    deleteInterest(editing.id);
    closeSheet();
    navigate("/");
  }

  return (
    <Sheet onClose={closeSheet}>
      <h2>{editing ? t("editOrb") : t("newInterest")}</h2>
      <Field label={t("name")}>
        <input ref={nameRef} type="text" maxLength={24} placeholder={t("interestPh")} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label={t("why")}>
        <input type="text" maxLength={80} placeholder={t("whyPh")} value={why} onChange={(e) => setWhy(e.target.value)} />
      </Field>
      <Field label={t("colour")}>
        <div className="swatches">
          {PALETTE.map((c) => (
            <button
              key={c}
              className="swatch"
              aria-pressed={c === color}
              aria-label={c}
              style={{ "--c": c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </Field>
      <Field label={t("timeLabel")}>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <Field label={t("friendsLabel")}>
        <input
          type="text"
          maxLength={60}
          placeholder={t("friendsPh")}
          value={friendsText}
          onChange={(e) => setFriendsText(e.target.value)}
        />
      </Field>

      <button className="btn" onClick={save}>{t("save")}</button>
      {editing && <button className="btn2 btn-danger" onClick={remove}>{t("deleteOrb")}</button>}
      <button className="btn2" onClick={closeSheet}>{t("cancel")}</button>
    </Sheet>
  );
}
