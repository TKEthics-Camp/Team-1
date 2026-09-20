import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useAuth } from "../../store/AuthContext";
import { useUI } from "../../ui/UIContext";
import { blockUser, reportContent } from "../../lib/remote";

const REPORT_REASONS = ["reportSpam", "reportMean", "reportUnsafe", "reportOther"];

// The "⋯" that lets someone report a thing or block whoever made it.
// reports.target_type accepts interest / photo / entry / user, and every one
// of those should be reachable from wherever the thing is actually looked at
// — a child who needs this is looking at the content, not hunting through
// settings.
//
// WHY THIS IS A SHEET AND NOT A DROPDOWN
// It used to be an absolutely-positioned menu hanging off the ⋯, which
// worked until it did not: opened low on a screen, or inside the full-screen
// photo viewer, the list ran past the bottom of the app frame and .app's
// `overflow: clip` cut it off. The report reasons were half visible and, in
// the photo viewer, effectively unreachable — so reporting a photo looked
// like something the app could not do.
//
// A sheet cannot be clipped by whatever happens to be around the button, it
// matches how every other choice in this app is made, and it gives a child
// a full-width target for a thing that matters. It is rendered through a
// portal into .app for the same reason: so no ancestor's overflow or
// positioning can interfere with it again.
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
  // "dots" is the quiet ⋯ used in a list, where a labelled button on every
  // row would shout. "button" is a plain labelled control, for the few
  // screens showing one thing at a time — a bare ⋯ on a dark photo viewer
  // is not something a child looking for help will find.
  variant = "dots",
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { showToast } = useUI();
  const [step, setStep] = useState(null); // null | "menu" | "report"

  useEffect(() => {
    if (!step) return undefined;
    function onKey(e) { if (e.key === "Escape") setStep(null); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step]);

  // Nothing to do without a signed-in user, and nobody blocks themselves.
  const canBlock = Boolean(authorId && user && authorId !== user.id);

  async function block() {
    setStep(null);
    if (!user || !authorId) return;
    if (onBlocked) onBlocked(authorId);
    const ok = await blockUser(user.id, authorId);
    showToast(ok ? t("blockedToast") : t("actionFailed"));
  }

  async function report(reasonKey) {
    setStep(null);
    if (!user) return;
    if (onReported) onReported(targetId);
    const ok = await reportContent(user.id, targetType, targetId, reasonKey);
    showToast(ok ? t("reportedToast") : t("actionFailed"));
  }

  if (!user) return null;

  // .app is the frame every sheet in this app lives inside; body is the
  // fallback for anything rendered outside it.
  const host = (typeof document !== "undefined"
    && (document.querySelector(".app") || document.body)) || null;

  const sheet = !step ? null : (
    <div
      /* report-bg lifts this above the full-screen photo viewer, which sits
         at z-index 30. Without it the sheet renders behind the photo — in
         precisely the place reporting matters most. */
      className="sheet-bg report-bg"
      onMouseDown={(e) => { if (e.target === e.currentTarget) setStep(null); }}
    >
      <div className="sheet report-sheet">
        {step === "menu" ? (
          <>
            <h2>{t("reportOrBlockTitle")}</h2>
            <button className="btn2 report-choice" onClick={() => setStep("report")}>
              {t("report")}
            </button>
            {canBlock && (
              <button className="btn2 report-choice btn-danger" onClick={block}>
                {t("block")}
              </button>
            )}
            <button className="btn2 report-choice" onClick={() => setStep(null)}>
              {t("cancel")}
            </button>
          </>
        ) : (
          <>
            <h2>{t("reportWhy")}</h2>
            {REPORT_REASONS.map((r) => (
              <button key={r} className="btn2 report-choice" onClick={() => report(r)}>
                {t(r)}
              </button>
            ))}
            <button className="btn2 report-choice" onClick={() => setStep(null)}>
              {t("cancel")}
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="post-menu-wrap">
      {variant === "button" ? (
        <button
          type="button"
          className="btn2 report-open"
          aria-expanded={step ? "true" : "false"}
          onClick={() => setStep(step ? null : "menu")}
        >
          {t("report")}
        </button>
      ) : (
        <button
          type="button"
          className="icon post-more"
          aria-label={label || t("moreOptions")}
          aria-expanded={step ? "true" : "false"}
          onClick={() => setStep(step ? null : "menu")}
        >
          ⋯
        </button>
      )}
      {sheet && host ? createPortal(sheet, host) : null}
    </div>
  );
}
