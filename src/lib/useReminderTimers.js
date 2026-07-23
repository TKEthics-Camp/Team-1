import { useEffect, useState } from "react";
import { registerPush, syncSchedule } from "./push";

// Real "outside the app" banners (30 min before, at the set time, and the
// 7pm/8am wither warnings) are now sent by the push server in /server, which
// runs independently of this tab — see server/src/scheduler.js. All this
// hook does locally is:
//   • keep the server's copy of each interest's schedule + last-logged day
//     in sync whenever local data changes, and
//   • force a re-render at the moment a nudge becomes due, so the in-app
//     banner (NudgeBanner) appears without needing a manual refresh.
// It does NOT itself fire any OS notification — a page-open tab isn't a
// reliable delivery mechanism, which is exactly what the push server fixes.
export function useReminderTimers(interests, entries, photos, lang) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (window.Notification && Notification.permission === "granted") {
      // registerPush reuses any existing subscription, so calling it again
      // here is cheap — it's what makes sure a subscription exists even when
      // permission was granted during onboarding rather than from the
      // Profile screen's button (which also calls it directly on grant).
      registerPush(lang);
      syncSchedule(interests, entries, photos, lang);
    }
  }, [interests, entries, photos, lang]);

  useEffect(() => {
    // Wake the in-app banner up right when each due window opens, so it
    // doesn't wait on some unrelated re-render to notice.
    const timers = [];
    const now = new Date();
    interests.forEach((it) => {
      if (!it.time) return;
      const [hh, mm] = it.time.split(":").map(Number);
      if (Number.isNaN(hh) || Number.isNaN(mm)) return;
      const due = new Date(now);
      due.setHours(hh, mm, 0, 0);
      due.setMinutes(due.getMinutes() - 90); // dueNudges' own window opens 90 min out
      const delay = due - now;
      if (delay <= 0 || delay > 12 * 3600000) return;
      timers.push(setTimeout(() => forceTick((n) => n + 1), delay));
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interests]);
}

export function askNotifications() {
  if (window.Notification && Notification.permission === "default") {
    try { Notification.requestPermission(); } catch (e) { /* ignore */ }
  }
}
