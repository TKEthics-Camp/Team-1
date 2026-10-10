import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { fmtDate, keyToDate } from "../../lib/dates";
import { useAudioURL } from "../../lib/image";
import EmptyState from "../shared/EmptyState";
import VoiceNote from "../shared/VoiceNote";
import ReportMenu from "../shared/ReportMenu";

// Own component so useAudioURL (which may need to fetch from Storage) runs
// once per entry rather than inside the list's own render — same shape as
// AlbumTab's PhotoThumb.
function EntryVoiceNote({ entry, cacheEntryAudio }) {
  const url = useAudioURL(entry, cacheEntryAudio && ((blob) => cacheEntryAudio(entry.id, blob)));
  return <VoiceNote url={url} ms={entry.audioMs} />;
}

const GLOBE = (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
  </svg>
);

// "THU" / "周四" — the day an entry was for, read from its date key
// (local, never UTC; see lib/dates).
function weekdayOf(dateKey, lang) {
  return keyToDate(dateKey).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { weekday: "short" });
}

// authorId is only passed for someone else's journal (see
// PublicInterestScreen) — it's what turns the edit/delete controls into a
// report control for the same row.
export default function JournalTab({ entries, readOnly, authorId = null, onEntryReported = null }) {
  const { t, lang } = useI18n();
  const { deleteEntry, cacheEntryAudio } = useStore();
  const { openSheet, offerUndo } = useUI();

  function remove(id) {
    const { restore, commit } = deleteEntry(id);
    offerUndo(t("entryDeleted"), restore, commit);
  }

  if (!entries.length) return <EmptyState text={t(readOnly ? "noEntriesPublic" : "noEntries")} />;

  return (
    <div className="timeline">
      {entries.map((e) => (
        <div className="entry" key={e.id}>
          {/* The day on the left, the entry on the right, a dot between —
              read down the left edge and it is a calendar. */}
          <div className="entry-when">
            <span className="wd">{weekdayOf(e.date, lang)}</span>
            <span className="d">{fmtDate(e.date, lang)}</span>
          </div>
          <div className="entry-card">
            {(e.isPinned || e.visibility === "public") && (
              <div className="entry-tags">
                {e.isPinned && <span className="tag tag-pin">★ {t("pinned")}</span>}
                {e.visibility === "public" && <span className="tag tag-public">{GLOBE} {t("visPublic")}</span>}
              </div>
            )}
            {e.text && <div className="t">{e.text}</div>}
            {(e.audio || e.audioPath) && <EntryVoiceNote entry={e} cacheEntryAudio={readOnly ? null : cacheEntryAudio} />}
            {!readOnly && (
              <div className="entry-actions">
                <button
                  className="icon"
                  aria-label={t("editEntry")}
                  onClick={() => openSheet("entry", { id: e.interestId, entryId: e.id })}
                >
                  ✎
                </button>
                <button className="icon" aria-label={t("del")} onClick={() => remove(e.id)}>×</button>
              </div>
            )}
            {readOnly && authorId && (
              <div className="entry-actions">
                <ReportMenu
                  targetType="entry"
                  targetId={e.id}
                  authorId={authorId}
                  onReported={onEntryReported}
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
