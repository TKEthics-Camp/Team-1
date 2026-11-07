import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { fmtDate, keyToDate, dateKey, today } from "../../lib/dates";
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

  // One card per day, newest first (entries arrive sorted), with the day's
  // total beside its heading — read down the headings and it is a calendar.
  const days = [];
  entries.forEach((e) => {
    const last = days[days.length - 1];
    if (last && last.date === e.date) last.items.push(e);
    else days.push({ date: e.date, items: [e] });
  });

  return (
    <div className="journal">
      {days.map((day) => {
        const label = fmtDate(day.date, lang);
        // "Today" and "Yesterday" say enough; older days get their weekday.
        const relative = label === fmtDate(today(), lang) || label === fmtDate(yesterday(), lang);
        const total = day.items.reduce((n, e) => n + (e.minutes || 0), 0);
        return (
          <section className="journal-day" key={day.date}>
            <div className="journal-day-head">
              <span className="journal-day-k">{relative ? label : weekdayOf(day.date, lang) + " · " + label}</span>
              {total > 0 && <span className="journal-day-total">{durationOf(total, t)}</span>}
            </div>
            <div className="journal-card">
              {day.items.map((e) => {
                const voice = !!(e.audio || e.audioPath);
                return (
                  <div className="journal-row" key={e.id}>
                    <span className="journal-ico" aria-hidden="true">
                      <Icon name={voice && !e.text ? "mic" : "book"} size={16} />
                    </span>
                    <div className="journal-body">
                      <div className={"t" + (e.text ? "" : " t-muted")}>{e.text || t("voiceNote")}</div>
                      {/* Small tinted tags for how, and who for. Duration
                          has its own place on the right. */}
                      {(voice && e.text || e.isPinned || e.visibility === "public") && (
                        <div className="entry-tags">
                          {voice && e.text && <Tag tone="purple" icon="mic">{t("tagVoice")}</Tag>}
                          {e.isPinned && <Tag tone="amber" icon="pin">{t("pinned")}</Tag>}
                          {e.visibility === "public" && <Tag tone="blue" icon="globe">{t("visPublic")}</Tag>}
                        </div>
                      )}
                      {voice && <EntryVoiceNote entry={e} cacheEntryAudio={readOnly ? null : cacheEntryAudio} />}
                    </div>
                    <div className="journal-side">
                      {e.minutes > 0 && <Tag tone="green">{durationOf(e.minutes, t)}</Tag>}
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
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}
