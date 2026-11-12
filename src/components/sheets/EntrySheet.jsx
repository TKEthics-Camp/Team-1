import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { uid } from "../../lib/id";
import { containsProfanity } from "../../lib/textFilter";
import { COINS_PER_LOG } from "../../lib/constants";
import { today, keyDays } from "../../lib/dates";
import { fmtDuration } from "../../lib/derived";
import { logOutcome, usualMinutes } from "../../lib/logOutcome";
import { celebrate, levelUpCelebrate } from "../../lib/feedback";
import Sheet from "../shared/Sheet";
import Field from "../shared/Field";
import Chip from "../shared/Chip";
import VisRow from "../shared/VisRow";
import VoiceNote from "../shared/VoiceNote";
import { useAudioURL } from "../../lib/image";
import { useRecorder, canRecord, fmtClock } from "../../lib/useRecorder";
import Icon from "../shared/Icon";

const DURATIONS = [15, 30, 45, 60, 90, 120];
const PROMPTS = 6;

function nearestPreset(minutes) {
  return DURATIONS.reduce((best, m) => (Math.abs(m - minutes) < Math.abs(best - minutes) ? m : best));
}

// A different question most days, steady for any one hobby on any one day:
// "What did you do today?" stops being read by the second week.
function promptKey(interestId) {
  let h = 0;
  for (let i = 0; i < interestId.length; i++) h += interestId.charCodeAt(i);
  return "logPrompt" + ((keyDays(today()) + h) % PROMPTS);
}

// Logging is the one thing a student does here every day, so the sheet is
// built around the shortest honest version of it: how long, and Log. The
// duration starts on what this hobby usually takes, a note is welcome but
// not demanded, and everything that is set once in a while — the date, who
// can see it, pinning — waits behind "More".
//
// `minutes` is passed when a session timer was just stopped (see
// SessionPill): the sheet opens with the measured time already chosen.
export default function EntrySheet({ interestId, entryId, minutes: timed = null }) {
  const { t, nameOf } = useI18n();
  const { interests, entries, photos, profile, addEntry, updateEntry, deleteEntry } = useStore();
  const { closeSheet, showToast, offerUndo, celebrate: showCelebration, session, startSession } = useUI();
  const it = interests.find((x) => x.id === interestId);
  const editing = entryId ? entries.find((e) => e.id === entryId) : null;

  const [date, setDate] = useState(editing ? editing.date : today());
  // What this hobby usually takes, as one of the standard lengths: "about
  // half an hour" is the useful memory, not that Tuesday ran to 34 minutes.
  // A session that was just timed keeps its exact length.
  const [minutes, setMinutes] = useState(
    editing ? editing.minutes : timed || nearestPreset(usualMinutes(entries, interestId))
  );
  const [text, setText] = useState(editing ? editing.text : "");
  const [visibility, setVisibility] = useState(editing ? editing.visibility || "private" : "private");
  const [shared, setShared] = useState(editing ? !!editing.sharedToFeed : false);
  const [blocked, setBlocked] = useState(false);
  const [pinned, setPinned] = useState(editing ? !!editing.isPinned : false);
  const [audio, setAudio] = useState(editing ? editing.audio || null : null);
  const [audioMs, setAudioMs] = useState(editing ? editing.audioMs || 0 : 0);
  const [audioPath, setAudioPath] = useState(editing ? editing.audioPath || null : null);
  // Open from the start when the entry already uses something in there, so
  // editing never hides a setting that is switched on.
  const [more, setMore] = useState(
    !!editing && (editing.date !== today() || editing.visibility === "public" || !!editing.isPinned)
  );
  const rec = useRecorder();
  // Editing an entry that was recorded on another device (or before this
  // one downloaded it) only has audioPath, not the blob itself yet —
  // useAudioURL fetches it from Storage so it still plays here instead of
  // looking like the recording vanished.
  const audioUrl = useAudioURL({ audio, audioPath });

  if (!it) return null;

  // The presets, plus whatever else is chosen: a timed session rarely lands
  // on a round number, and an old entry may predate these choices.
  const choices = DURATIONS.includes(minutes) || !(minutes > 0)
    ? DURATIONS
    : [minutes, ...DURATIONS];

  async function toggleRecord() {
    if (rec.recording) {
      const blob = await rec.stop();
      if (blob) { setAudio(blob); setAudioMs(rec.ms); }
      return;
    }
    await rec.start();
  }

  // Same optimistic hide and undo window as before; it just lives here now
  // that an entry is opened by tapping its row.
  function remove() {
    const { restore, commit } = deleteEntry(editing.id);
    closeSheet();
    offerUndo(t("entryDeleted"), restore, commit);
  }

  function useTimer() {
    startSession(it.id);
    closeSheet();
    showToast(t("timerStarted"));
  }

  function save() {
    const txt = text.trim();
    // Private entries are a diary and are left alone. This only guards what
    // leaves the account: once an entry is public it is readable by other
    // children, and that is the moment the words stop being the writer's
    // own business. The server refuses the same write (20260920000000), so
    // this is the fast, explainable half rather than the enforcing half.
    if (visibility === "public" && containsProfanity(txt)) {
      setBlocked(true);
      setMore(true);
      return;
    }
    if (rec.recording) return;   // don't save a half-finished recording
    // A future day would count as the tree's last visit for weeks to come,
    // so it couldn't wilt. The picker refuses one; a typed date might not.
    const day = !date || date > today() ? today() : date;
    // Only words can be shared to Explore: a post there is its text.
    const sharedToFeed = visibility === "public" && shared && !!txt;
    if (editing) {
      updateEntry({ ...editing, date: day, text: txt, minutes, visibility, isPinned: pinned, sharedToFeed, audio, audioMs, audioPath, updatedAt: Date.now() }, editing);
      celebrate(profile);
      closeSheet();
      return;
    }
    const entry = {
      id: uid(), interestId: it.id, date: day, text: txt,
      minutes, visibility, isPinned: pinned, sharedToFeed,
      audio, audioMs,
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    // Worked out against the garden as it is now, before the entry lands,
    // so the reward shows exactly what this log changed.
    const outcome = logOutcome(it, entries, photos, { entry });
    addEntry(entry);
    if (outcome.leveledUp) levelUpCelebrate(profile); else celebrate(profile);
    closeSheet();
    showCelebration({ interestId: it.id, minutes, coins: COINS_PER_LOG, ...outcome });
  }

  return (
    <Sheet onClose={closeSheet} className="log-sheet">
      <h2>{editing ? t("editEntry") + " · " + nameOf(it) : t("logTitle").replace("{name}", nameOf(it))}</h2>

      <div className="field">
        <div className="log-label-row">
          <span className="label">{t("howLong")}</span>
          {/* Go and do it, then come back: the timer fills this in. Not
              offered while one is running, straight after one was stopped,
              or when fixing an old entry. */}
          {!editing && !session && !timed && (
            <button type="button" className="log-link btn-with-ico" onClick={useTimer}>
              <Icon name="clock" size={14} />{t("useTimer")}
            </button>
          )}
        </div>
        <div className={"dur-grid" + (choices.length > DURATIONS.length ? " dur-grid-wide" : "")}>
          {choices.map((m) => (
            <button
              key={m}
              type="button"
              className="dur"
              aria-pressed={minutes === m ? "true" : "false"}
              onClick={() => setMinutes(m)}
            >
              {fmtDuration(m)}
            </button>
          ))}
        </div>
      </div>

      {/* Optional, and not focused on open: the keyboard sliding up over the
          sheet is the opposite of quick. */}
      <textarea
        className="log-note"
        aria-label={t(promptKey(it.id))}
        placeholder={t(promptKey(it.id))}
        maxLength={600}
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {(audio || audioPath) && (
        <VoiceNote url={audioUrl} ms={audioMs} onRemove={() => { setAudio(null); setAudioMs(0); setAudioPath(null); }} />
      )}

      <div className="log-tools">
        {canRecord() && !(audio || audioPath) && (
          <>
            <button
              type="button"
              className={"chip rec-btn btn-with-ico" + (rec.recording ? " on" : "")}
              onClick={toggleRecord}
            >
              <Icon name={rec.recording ? "square" : "mic"} size={15} />
              {rec.recording ? t("recStop") + " · " + fmtClock(rec.ms) : t("voiceNote")}
            </button>
            {rec.recording && (
              <button type="button" className="chip" onClick={rec.cancel}>{t("cancel")}</button>
            )}
          </>
        )}
        <button
          type="button"
          className="chip btn-with-ico log-more"
          aria-expanded={more ? "true" : "false"}
          onClick={() => setMore((m) => !m)}
        >
          {t("moreOptions")}
          <Icon name="chevronRight" size={14} className={"log-chev" + (more ? " open" : "")} />
        </button>
      </div>
      {rec.state === "denied" && <span className="field-error">{t("recDenied")}</span>}
      {rec.state === "unsupported" && <span className="field-error">{t("recUnsupported")}</span>}

      {more && (
        <div className="log-more-body">
          <Field label={t("date")}>
            <input type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <VisRow value={visibility} onChange={(v) => { setVisibility(v); setBlocked(false); }} />
          {blocked && (
            <div className="field-error">{t("filterBlockedPublic")}</div>
          )}
          {/* Sharing is a second, deliberate step on top of Public: a public
              entry sits quietly on your profile until you actually choose to
              broadcast it. Going back to Private takes the offer away, and
              save() re-checks so the flag can't survive the switch. */}
          {visibility === "public" && (
            <>
              <button
                type="button"
                className="btn2 share-toggle btn-with-ico"
                aria-pressed={shared ? "true" : "false"}
                onClick={() => setShared((v) => !v)}
              >
                <Icon name={shared ? "check" : "plus"} size={16} />
                {t("shareToExplore")}
              </button>
              <span className="sub">{t("shareToExploreNote")}</span>
            </>
          )}
          <div className="chips">
            <Chip pressed={pinned} onClick={() => setPinned((p) => !p)} className="btn-with-ico">
              <Icon name="pin" size={14} />
              {t("pin")}
            </Chip>
          </div>
        </div>
      )}

      <button className="btn log-go" onClick={save}>
        {editing ? t("save") : t("logFor").replace("{d}", fmtDuration(minutes))}
      </button>
      <div className="log-foot">
        <button className="btn2 log-cancel" onClick={closeSheet}>{t("cancel")}</button>
        {editing && (
          <button className="btn2 log-cancel log-delete" onClick={remove}>{t("deleteEntry")}</button>
        )}
      </div>
    </Sheet>
  );
}
