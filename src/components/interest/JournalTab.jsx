import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { fmtDate } from "../../lib/dates";
import EmptyState from "../shared/EmptyState";

export default function JournalTab({ entries, readOnly }) {
  const { t, lang } = useI18n();
  const { deleteEntry } = useStore();
  const { openSheet } = useUI();

  if (!entries.length) return <EmptyState text={t(readOnly ? "noEntriesPublic" : "noEntries")} />;

  return (
    <>
      {entries.map((e) => (
        <div className="entry" key={e.id}>
          <div>
            <div className="d">{fmtDate(e.date, lang) + (e.isPinned ? "  ★" : "") + (e.visibility === "public" ? "  🌐" : "")}</div>
            <div className="t">{e.text}</div>
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
              <button className="icon" aria-label={t("del")} onClick={() => deleteEntry(e.id)}>×</button>
            </>
          )}
        </div>
      ))}
    </>
  );
}
