import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { uid } from "../../lib/id";
import { today } from "../../lib/dates";
import Sheet from "../shared/Sheet";
import Field from "../shared/Field";
import Chip from "../shared/Chip";

const DURATIONS = [15, 30, 45, 60, 90, 120];

export default function EntrySheet({ interestId }) {
  const { t, nameOf } = useI18n();
  const { interests, addEntry } = useStore();
  const { closeSheet } = useUI();
  const navigate = useNavigate();
  const it = interests.find((x) => x.id === interestId);

  const [date, setDate] = useState(today());
  const [minutes, setMinutes] = useState(30);
  const [text, setText] = useState("");
  const [pinned, setPinned] = useState(false);
  const textRef = useRef(null);

  useEffect(() => { textRef.current?.focus(); }, []);

  if (!it) return null;

  function save() {
    const txt = text.trim();
    if (!txt) { textRef.current?.focus(); return; }
    const rec = {
      id: uid(), interestId: it.id, date: date || today(), text: txt,
      minutes, isPinned: pinned, createdAt: Date.now(), updatedAt: Date.now(),
    };
    addEntry(rec);
    closeSheet();
    navigate(`/saved/${it.id}`);
  }

  return (
    <Sheet onClose={closeSheet}>
      <h2>{t("addEntry") + " · " + nameOf(it)}</h2>
      <Field label={t("date")}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label={t("howLong")}>
        <div className="chips">
          {DURATIONS.map((m) => (
            <Chip key={m} pressed={minutes === m} onClick={() => setMinutes(m)}>
              {m < 60 ? m + "m" : m / 60 + "h"}
            </Chip>
          ))}
        </div>
      </Field>
      <textarea
        ref={textRef}
        placeholder={t("entryPh")}
        maxLength={600}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="chips">
        <Chip pressed={pinned} onClick={() => setPinned((p) => !p)}>
          {(pinned ? "★ " : "☆ ") + t("pin")}
        </Chip>
      </div>
      <button className="btn" onClick={save}>{t("save")}</button>
      <button className="btn2" onClick={closeSheet}>{t("cancel")}</button>
    </Sheet>
  );
}
