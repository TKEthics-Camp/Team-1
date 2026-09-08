import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";

// A quiet indicator for the sync-status middle ground (see StoreContext's
// pendingSyncCount/retrySync): something failed to reach the server and is
// waiting to be retried. Deliberately delayed — a one-off network blip
// clears itself within seconds and shouldn't ever be visible — so this
// only shows up once something's stayed stuck for a while.
const SHOW_AFTER_MS = 30000;

export default function SyncStatusBadge() {
  const { t } = useI18n();
  const { pendingSyncCount, retrySync } = useStore();
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!pendingSyncCount) {
      setVisible(false);
      setOpen(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [pendingSyncCount]);

  if (!visible || !pendingSyncCount) return null;

  return (
    <div className="sync-badge">
      <button
        type="button"
        className="sync-chip"
        aria-label={t("syncPendingLabel")}
        onClick={() => setOpen((o) => !o)}
      >
        ☁️
      </button>
      {open && (
        <div className="sync-popover" role="status">
          <p>{t("syncPendingMsg")}</p>
          <button
            type="button"
            className="btn2"
            onClick={() => { retrySync(); setOpen(false); }}
          >
            {t("syncRetry")}
          </button>
        </div>
      )}
    </div>
  );
}
