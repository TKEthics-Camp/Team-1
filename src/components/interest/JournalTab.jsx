import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { fmtDate, keyToDate, dateKey, today } from "../../lib/dates";
import { useAudioURL } from "../../lib/image";
import EmptyState from "../shared/EmptyState";
import VoiceNote from "../shared/VoiceNote";
import ReportMenu from "../shared/ReportMenu";
import Icon, { Tag, hobbyLook } from "../shared/Icon";

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

// Your own entry opens when its row is tapped, to edit it or delete it from
// there. authorId is only passed for someone else's journal (see
// PublicInterestScreen): those rows don't open, and carry a report control
// instead.
//
// `interests` is passed by the Journal tab, where entries from every hobby
// share one list: each row then leads with its hobby's icon and name.
export default function JournalTab({ entries, readOnly, authorId = null, onEntryReported = null, interests = null }) {
  const { t, lang, nameOf } = useI18n();
  const { cacheEntryAudio } = useStore();
  const { openSheet } = useUI();

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
                const hobby = interests ? interests.find((x) => x.id === e.interestId) : null;
                const look = hobby ? hobbyLook(hobby.name) : null;
                const words = e.text || t(voice ? "voiceNote" : "justLogged");
                return (
                  <div className={"journal-row" + (readOnly ? "" : " can-open")} key={e.id}>
                    {look ? (
                      <span className={"journal-ico idea-ico stat-ico tag-" + look.tone} aria-hidden="true">
                        <Icon name={look.icon} size={17} />
                      </span>
                    ) : (
                      <span className="journal-ico" aria-hidden="true">
                        <Icon name={voice && !e.text ? "mic" : "book"} size={16} />
                      </span>
                    )}
                    <div className="journal-body">
                      {hobby && <div className="journal-hobby">{nameOf(hobby)}</div>}
                      {/* A log can be just its time, with neither words nor a
                          recording. On your own journal the words are the
                          button: its hit area is stretched over the whole row
                          in CSS, the way a tree card's name is, so the voice
                          player inside the row stays a control of its own. */}
                      {readOnly ? (
                        <div className={"t" + (e.text ? "" : " t-muted")}>{words}</div>
                      ) : (
                        <button
                          type="button"
                          className={"journal-open t" + (e.text ? "" : " t-muted")}
                          title={t("editEntry")}
                          onClick={() => openSheet("entry", { id: e.interestId, entryId: e.id })}
                        >
                          {words}
                        </button>
                      )}
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
