import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { fmtDate } from "../../lib/dates";
import EmptyState from "../shared/EmptyState";

export default function JournalTab({ entries }) {
  const { t, lang } = useI18n();
  const { deleteEntry } = useStore();

  if (!entries.length) return <EmptyState text={t("noEntries")} />;

  return (
    <>
      {entries.map((e) => (
        <div className="entry" key={e.id}>
          <div>
            <div className="d">{fmtDate(e.date, lang) + (e.isPinned ? "  ★" : "") + (e.visibility === "public" ? "  🌐" : "")}</div>
            <div className="t">{e.text}</div>
          </div>
          <button className="icon" aria-label={t("del")} onClick={() => deleteEntry(e.id)}>×</button>
        </div>
      ))}
    </>
  );
}
