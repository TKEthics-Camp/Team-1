import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { fmtDate, keyToDate } from "../../lib/dates";
import { useAudioURL } from "../../lib/image";
import EmptyState from "../shared/EmptyState";
import VoiceNote from "../shared/VoiceNote";
import ReportMenu from "../shared/ReportMenu";
import Icon, { Tag } from "../shared/Icon";

// Own component so useAudioURL (which may need to fetch from Storage) runs
// once per entry rather than inside the list's own render — same shape as
// AlbumTab's PhotoThumb.
function EntryVoiceNote({ entry, cacheEntryAudio }) {
  const url = useAudioURL(entry, cacheEntryAudio && ((blob) => cacheEntryAudio(entry.id, blob)));
  return <VoiceNote url={url} ms={entry.audioMs} />;
}

// "30 min", "1.5 h" — how long the entry was for.
function durationOf(minutes, t) {
  if (!minutes) return null;
  if (minutes < 60) return t("durMin").replace("{n}", minutes);
  return t("durHours").replace("{n}", +(minutes / 60).toFixed(1));
}

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
            {/* Small tinted tags, each with its own icon and colour, so a
                glance down the timeline reads how long, how, and who for. */}
            <div className="entry-tags">
              {e.minutes > 0 && <Tag tone="green" icon="clock">{durationOf(e.minutes, t)}</Tag>}
              {(e.audio || e.audioPath) && <Tag tone="purple" icon="mic">{t("tagVoice")}</Tag>}
              {e.isPinned && <Tag tone="amber" icon="pin">{t("pinned")}</Tag>}
              {e.visibility === "public" && <Tag tone="blue" icon="globe">{t("visPublic")}</Tag>}
            </div>
            {e.text && <div className="t">{e.text}</div>}
            {(e.audio || e.audioPath) && <EntryVoiceNote entry={e} cacheEntryAudio={readOnly ? null : cacheEntryAudio} />}
            {!readOnly && (
              <div className="entry-actions">
                <button
                  className="icon"
                  aria-label={t("editEntry")}
                  onClick={() => openSheet("entry", { id: e.interestId, entryId: e.id })}
                >
                  <Icon name="pencil" size={15} />
                </button>
                <button className="icon" aria-label={t("del")} onClick={() => remove(e.id)}>
                  <Icon name="x" size={16} />
                </button>
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
