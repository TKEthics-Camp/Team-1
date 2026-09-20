import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useAuth } from "../../store/AuthContext";
import { useUI } from "../../ui/UIContext";
import { blockUser, reportContent } from "../../lib/remote";

const REPORT_REASONS = ["reportSpam", "reportMean", "reportUnsafe", "reportOther"];

// The "⋯" menu that lets someone report a thing or block whoever made it.
// reports.target_type accepts interest / photo / entry / user, and every one
// of those should be reachable from wherever the thing is actually looked at
// — a child who needs this is looking at the content, not hunting for a
// settings screen.
//
// Blocking is hidden when there's no author to block (your own content, or a
// caller that didn't pass one). Both actions tell the caller first and talk
// to the network after: the row is already on screen, and making someone
// wait on a request to stop seeing something they just reported reads badly.
export default function ReportMenu({
  targetType,
  targetId,
  authorId = null,
  onReported = null,
  onBlocked = null,
  label = null,
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { showToast } = useUI();
  const [menu, setMenu] = useState(null); // null | "menu" | "report"
  const wrapRef = useRef(null);

  // Without this an open menu stays open forever — tapping elsewhere doesn't
  // dismiss it, and a journal full of entries can end up with several open at
  // once, each overlapping the row below. Closing on any outside press keeps
  // one open at a time, since opening a second one dismisses the first.
  useEffect(() => {
    if (!menu) return undefined;
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenu(null);
    }
    function onKey(e) {
      if (e.key === "Escape") setMenu(null);
    }
    // pointerdown, not click: it fires before the press lands on whatever is
    // underneath, so dismissing doesn't also activate it.
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  // Nothing to do without a signed-in user, and nobody blocks themselves.
  const canBlock = Boolean(authorId && user && authorId !== user.id);

  async function block() {
    setMenu(null);
    if (!user || !authorId) return;
    if (onBlocked) onBlocked(authorId);
    const ok = await blockUser(user.id, authorId);
    showToast(ok ? t("blockedToast") : t("actionFailed"));
  }

  async function report(reasonKey) {
    setMenu(null);
    if (!user) return;
    if (onReported) onReported(targetId);
    const ok = await reportContent(user.id, targetType, targetId, reasonKey);
    showToast(ok ? t("reportedToast") : t("actionFailed"));
  }

  if (!user) return null;

  return (
    <div className="post-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className="icon post-more"
        aria-label={label || t("moreOptions")}
        aria-expanded={menu ? "true" : "false"}
        onClick={() => setMenu(menu ? null : "menu")}
      >
        ⋯
      </button>
      {menu === "menu" && (
        <div className="post-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => setMenu("report")}>{t("report")}</button>
          {canBlock && (
            <button type="button" role="menuitem" className="danger" onClick={block}>{t("block")}</button>
          )}
          <button type="button" role="menuitem" onClick={() => setMenu(null)}>{t("cancel")}</button>
        </div>
      )}
      {menu === "report" && (
        <div className="post-menu" role="menu">
          <div className="post-menu-head">{t("reportWhy")}</div>
          {REPORT_REASONS.map((r) => (
            <button key={r} type="button" role="menuitem" onClick={() => report(r)}>{t(r)}</button>
          ))}
          <button type="button" role="menuitem" onClick={() => setMenu(null)}>{t("cancel")}</button>
        </div>
      )}
    </div>
  );
}
