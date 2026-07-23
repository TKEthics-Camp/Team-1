import { X } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { fmtEntryDate } from "../../lib/dates";
import EmptyState from "../shared/EmptyState";

export default function JournalTab({ entries }) {
  const { t, lang } = useI18n();
  const { deleteEntry } = useStore();

  if (!entries.length) return <EmptyState text={t("noEntries")} />;

  return (
    <>
      {entries.map((e) => {
        const { day, weekday } = fmtEntryDate(e.date, lang);
        return (
          <div className="journal-card" key={e.id}>
            <div className="head">
              <span className="d">{day + (e.isPinned ? " ★" : "")}</span>
              <span className="wd">{weekday}</span>
            </div>
            <div className="t">{e.text}</div>
            <button className="icon del" aria-label={t("del")} onClick={() => deleteEntry(e.id)}>
              <X size={15} />
            </button>
          </div>
        );
      })}
    </>
  );
}
