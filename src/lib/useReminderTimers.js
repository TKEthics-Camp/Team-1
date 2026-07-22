import { useEffect, useState } from "react";
import { parseTime, minutesNow, nudgeText } from "./reminders";

// Schedules a browser Notification 15 minutes before each interest's usual
// time, and nudges consumers to re-render (so the in-app nudge banner, which
// is computed live from dueNudges(), reflects the moment it fires. Re-runs
// whenever the interest list (times, count) changes.
export function useReminderTimers(interests, lang, nameOf, t) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const timers = [];
    const now = minutesNow();
    interests.forEach((it) => {
      const mins = parseTime(it.time);
      if (mins === null) return;
      const fireAt = mins - 15; // 15 minutes before
      const delay = (fireAt - now) * 60000;
      if (delay <= 0 || delay > 12 * 3600000) return;
      timers.push(setTimeout(() => {
        if (window.Notification && Notification.permission === "granted") {
          try { new Notification(t("appName"), { body: nudgeText(it, lang, nameOf, t) }); } catch (e) {}
        }
        forceTick((n) => n + 1);
      }, delay));
    });
    return () => timers.forEach(clearTimeout);
  }, [interests, lang]);
}

export function askNotifications() {
  if (window.Notification && Notification.permission === "default") {
    try { Notification.requestPermission(); } catch (e) {}
  }
}
