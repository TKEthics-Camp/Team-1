import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { uid } from "../../lib/id";
import { COINS_PER_LOG } from "../../lib/constants";
import { today } from "../../lib/dates";
import { actsToNextStage } from "../../lib/tree";
import { celebrate, levelUpCelebrate } from "../../lib/feedback";
import Sheet from "../shared/Sheet";
import Field from "../shared/Field";
import Chip from "../shared/Chip";
import VisRow from "../shared/VisRow";
import VoiceNote from "../shared/VoiceNote";
import { useRecorder, canRecord, fmtClock } from "../../lib/useRecorder";

const DURATIONS = [15, 30, 45, 60, 90, 120];

export default function EntrySheet({ interestId, entryId }) {
  const { t, nameOf } = useI18n();
  const { interests, entries, photos, profile, addEntry, updateEntry } = useStore();
  const { closeSheet, showToast } = useUI();
  const it = interests.find((x) => x.id === interestId);
  const editing = entryId ? entries.find((e) => e.id === entryId) : null;

  const [date, setDate] = useState(editing ? editing.date : today());
  const [minutes, setMinutes] = useState(editing ? editing.minutes : 30);
  const [text, setText] = useState(editing ? editing.text : "");
  const [visibility, setVisibility] = useState(editing ? editing.visibility || "private" : "private");
  const [shared, setShared] = useState(editing ? !!editing.sharedToFeed : false);
  const [pinned, setPinned] = useState(editing ? !!editing.isPinned : false);
  const [audio, setAudio] = useState(editing ? editing.audio || null : null);
  const [audioMs, setAudioMs] = useState(editing ? editing.audioMs || 0 : 0);
  const rec = useRecorder();
  const textRef = useRef(null);

  useEffect(() => { textRef.current?.focus(); }, []);

  if (!it) return null;

  async function toggleRecord() {
    if (rec.recording) {
      const blob = await rec.stop();
      if (blob) { setAudio(blob); setAudioMs(rec.ms); }
      return;
    }
    await rec.start();
  }

  function save() {
    const txt = text.trim();
    // A voice note is a whole entry on its own — the point of the feature is
    // logging without typing, so text is only required when there's no
    // recording to stand in for it.
    if (!txt && !audio) { textRef.current?.focus(); return; }
    if (rec.recording) return;   // don't save a half-finished recording
    if (editing) {
      updateEntry({ ...editing, date: date || today(), text: txt, minutes, visibility, isPinned: pinned, sharedToFeed: visibility === "public" && shared, audio, audioMs, updatedAt: Date.now() });
      celebrate(profile);
    } else {
      const leveledUp = actsToNextStage(it, entries, photos) === 1;
      addEntry({
        id: uid(), interestId: it.id, date: date || today(), text: txt,
        minutes, visibility, isPinned: pinned,
        sharedToFeed: visibility === "public" && shared,
        audio, audioMs,
        createdAt: Date.now(), updatedAt: Date.now(),
      });
      if (leveledUp) levelUpCelebrate(profile); else celebrate(profile);
      showToast(t("coinsEarned").replace("{n}", COINS_PER_LOG));
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
      {canRecord() && (
        <Field label={t("voiceNote")}>
          {audio ? (
            <VoiceNote blob={audio} ms={audioMs} onRemove={() => { setAudio(null); setAudioMs(0); }} />
          ) : (
            <div className="row" style={{ gap: 10 }}>
              <button
                type="button"
                className={"btn2 rec-btn" + (rec.recording ? " on" : "")}
                onClick={toggleRecord}
              >
                {rec.recording ? "■ " + t("recStop") + " · " + fmtClock(rec.ms) : "● " + t("recStart")}
              </button>
              {rec.recording && (
                <button type="button" className="chip" onClick={rec.cancel}>{t("cancel")}</button>
              )}
            </div>
          )}
          <span className="hint">{t("voiceNoteNote")}</span>
          {rec.state === "denied" && <span className="field-error">{t("recDenied")}</span>}
          {rec.state === "unsupported" && <span className="field-error">{t("recUnsupported")}</span>}
        </Field>
      )}
      <VisRow value={visibility} onChange={setVisibility} />
      {/* Sharing is a second, deliberate step on top of Public: a public
          entry sits quietly on your profile until you actually choose to
          broadcast it. Going back to Private takes the offer away, and
          save() re-checks so the flag can't survive the switch. */}
      {visibility === "public" && (
        <button
          type="button"
          className="btn2 share-toggle"
          aria-pressed={shared ? "true" : "false"}
          onClick={() => setShared((v) => !v)}
        >
          {(shared ? "✓ " : "＋ ") + t("shareToExplore")}
        </button>
      )}
      <span className="sub">{t("shareToExploreNote")}</span>
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
