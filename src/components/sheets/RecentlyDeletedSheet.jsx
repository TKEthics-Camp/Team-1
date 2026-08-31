import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { TRASH_DAYS } from "../../lib/constants";
import { fmtDate, dateKey } from "../../lib/dates";
import Sheet from "../shared/Sheet";
import EmptyState from "../shared/EmptyState";

export default function RecentlyDeletedSheet() {
  const { t, lang, nameOf } = useI18n();
  const { listTrash, restoreTrashed, purgeTrashed } = useStore();
  const { closeSheet, showToast } = useUI();
  const [items, setItems] = useState(null);
  const [armed, setArmed] = useState(null); // id awaiting a second tap to erase

  const load = useCallback(() => { listTrash().then(setItems); }, [listTrash]);
  useEffect(() => { load(); }, [load]);

  function label(item) {
    if (item.kind === "interest") return nameOf(item.rec);
    if (item.kind === "photo") return item.rec.caption || t("photos");
    return item.rec.text ? item.rec.text.slice(0, 60) : t("entries");
  }

  // How long this one has left, so "recently deleted" is a real countdown
  // rather than a vague promise.
  function daysLeft(item) {
    return Math.max(0, TRASH_DAYS - Math.floor((Date.now() - item.deletedAt) / 86400000));
  }

  async function restore(item) {
    await restoreTrashed(item.kind, item.rec.id);
    showToast(t("restoredToast"));
    load();
  }

  async function erase(item) {
    if (armed !== item.rec.id) { setArmed(item.rec.id); return; }
    await purgeTrashed(item.kind, item.rec.id);
    setArmed(null);
    load();
  }

  return (
    <Sheet onClose={closeSheet}>
      <h2>{t("recentlyDeleted")}</h2>
      <div className="sub">{t("trashNote").replace("{n}", TRASH_DAYS)}</div>

      {items === null ? (
        <div className="sub">{t("feedLoading")}</div>
      ) : !items.length ? (
        <EmptyState text={t("trashEmpty")} />
      ) : (
        <div className="trash-list">
          {items.map((item) => (
            <div key={item.kind + item.rec.id} className="trash-row">
              <span className="trash-ico" aria-hidden="true">
                {item.kind === "interest" ? "🌳" : item.kind === "photo" ? "🖼️" : "📓"}
              </span>
              <span className="trash-txt">
                <span className="t">{label(item)}</span>
                <span className="sub">
                  {fmtDate(dateKey(new Date(item.deletedAt)), lang) + " · " +
                    t("trashDaysLeft").replace("{n}", daysLeft(item))}
                </span>
              </span>
              <button type="button" className="chip" onClick={() => restore(item)}>{t("restore")}</button>
              <button
                type="button"
                className={"chip trash-erase" + (armed === item.rec.id ? " armed" : "")}
                onClick={() => erase(item)}
              >
                {armed === item.rec.id ? t("confirmClear") : t("eraseNow")}
              </button>
            </div>
          ))}
        </div>
      )}

      <button className="btn2" onClick={closeSheet}>{t("close")}</button>
    </Sheet>
  );
}
