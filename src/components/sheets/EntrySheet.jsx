import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { uid } from "../../lib/id";
import { today } from "../../lib/dates";
import { actsToNextStage } from "../../lib/tree";
import { celebrate, levelUpCelebrate } from "../../lib/feedback";
import Sheet from "../shared/Sheet";
import Field from "../shared/Field";
import Chip from "../shared/Chip";
import VisRow from "../shared/VisRow";

const DURATIONS = [15, 30, 45, 60, 90, 120];

export default function EntrySheet({ interestId, entryId }) {
  const { t, nameOf } = useI18n();
  const { interests, entries, photos, profile, addEntry, updateEntry } = useStore();
  const { closeSheet } = useUI();
  const it = interests.find((x) => x.id === interestId);
  const editing = entryId ? entries.find((e) => e.id === entryId) : null;

  const [date, setDate] = useState(editing ? editing.date : today());
  const [minutes, setMinutes] = useState(editing ? editing.minutes : 30);
  const [text, setText] = useState(editing ? editing.text : "");
  const [visibility, setVisibility] = useState(editing ? editing.visibility || "private" : "private");
  const [pinned, setPinned] = useState(editing ? !!editing.isPinned : false);
  const textRef = useRef(null);

  useEffect(() => { textRef.current?.focus(); }, []);

  if (!it) return null;

  function save() {
    const txt = text.trim();
    if (!txt) { textRef.current?.focus(); return; }
    if (editing) {
      updateEntry({ ...editing, date: date || today(), text: txt, minutes, visibility, isPinned: pinned, updatedAt: Date.now() });
      celebrate(profile);
    } else {
      const leveledUp = actsToNextStage(it, entries, photos) === 1;
      addEntry({
        id: uid(), interestId: it.id, date: date || today(), text: txt,
        minutes, visibility, isPinned: pinned, createdAt: Date.now(), updatedAt: Date.now(),
      });
      if (leveledUp) levelUpCelebrate(profile); else celebrate(profile);
    }
    closeSheet();
  }

  return (
    <Sheet onClose={closeSheet}>
      <h2>{(editing ? t("editEntry") : t("addEntry")) + " · " + nameOf(it)}</h2>
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
      <VisRow value={visibility} onChange={setVisibility} />
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
