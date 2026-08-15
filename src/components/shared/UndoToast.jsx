import { useI18n } from "../../i18n/I18nContext";
import { useUI } from "../../ui/UIContext";

// A bottom banner offering a short window to reverse a delete before it
// actually commits (to IndexedDB/remote) — see UIContext's offerUndo.
export default function UndoToast() {
  const { t } = useI18n();
  const { undo, undoNow } = useUI();
  if (!undo) return null;

  return (
    <div className="undo-toast" role="status">
      <span>{undo.message}</span>
      <button className="undo-btn" onClick={undoNow}>{t("undo")}</button>
    </div>
  );
}
