import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { fmtDate } from "../../lib/dates";
import { useAudioURL } from "../../lib/image";
import EmptyState from "../shared/EmptyState";
import VoiceNote from "../shared/VoiceNote";

// Own component so useAudioURL (which may need to fetch from Storage) runs
// once per entry rather than inside the list's own render — same shape as
// AlbumTab's PhotoThumb.
function EntryVoiceNote({ entry, cacheEntryAudio }) {
  const url = useAudioURL(entry, cacheEntryAudio && ((blob) => cacheEntryAudio(entry.id, blob)));
  return <VoiceNote url={url} ms={entry.audioMs} />;
}

export default function JournalTab({ entries, readOnly }) {
  const { t, lang } = useI18n();
  const { deleteEntry, cacheEntryAudio } = useStore();
  const { openSheet, offerUndo } = useUI();

  function remove(id) {
    const { restore, commit } = deleteEntry(id);
    offerUndo(t("entryDeleted"), restore, commit);
  }

  if (!entries.length) return <EmptyState text={t(readOnly ? "noEntriesPublic" : "noEntries")} />;

  return (
    <>
      {entries.map((e) => (
        <div className="entry" key={e.id}>
          <div>
            <div className="d">{fmtDate(e.date, lang) + (e.isPinned ? "  ★" : "") + (e.visibility === "public" ? "  🌐" : "")}</div>
            {e.text && <div className="t">{e.text}</div>}
            {(e.audio || e.audioPath) && <EntryVoiceNote entry={e} cacheEntryAudio={readOnly ? null : cacheEntryAudio} />}
          </div>
          {!readOnly && (
            <>
              <button
                className="icon"
                aria-label={t("editEntry")}
                onClick={() => openSheet("entry", { id: e.interestId, entryId: e.id })}
              >
                ✎
              </button>
              <button className="icon" aria-label={t("del")} onClick={() => remove(e.id)}>×</button>
            </>
          )}
        </div>
      ))}
    </>
  );
}
