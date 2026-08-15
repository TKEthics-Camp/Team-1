import { useEffect, useState } from "react";
import { parseTime, minutesNow, nudgeText, dueNudges, isScheduledToday } from "./reminders";
import { treeHealth } from "./tree";
import { today } from "./dates";

// Fire-once-per-day guard, module-scoped so it survives re-renders.
const fired = new Set();
function once(key, fn) {
  if (fired.has(key)) return;
  fired.add(key);
  fn();
}
function notify(title, body) {
  if (window.Notification && Notification.permission === "granted") {
    try { new Notification(title, { body }); } catch (e) { /* ignore */ }
  }
}

// Drives every notification the app can send (all while the tab is open — a
// no-server web app can't push in the background):
//   • reminders around each tree's usual time,
//   • a heads-up when a tree is drying out or has died.
// Also nudges a re-render so the in-app banner reflects the live state.
export function useReminderTimers(interests, entries, photos, lang, nameOf, t) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const day = today();

    // 1) trees that are due right now → notify immediately (once/day)
    dueNudges(interests, entries, {}).forEach((it) => {
      once(`due:${it.id}:${day}`, () => notify(t("appName"), nudgeText(it, lang, nameOf, t)));
    });

    // 2) trees drying out or dead → a gentle heads-up (once/day each)
    interests.forEach((it) => {
      const h = treeHealth(it, entries, photos);
      if (h === "wilting" || h === "bare") {
        once(`dry:${it.id}:${day}`, () => notify(t("appName"), `${nameOf(it)} — ${t("hlWilting")}`));
      } else if (h === "dead") {
        once(`dead:${it.id}:${day}`, () => notify(t("appName"), `${nameOf(it)} — ${t("hlDead")}`));
      }
    });

    // 3) schedule reminders still ahead today (15 min before the usual time)
    const timers = [];
    const now = minutesNow();
    interests.forEach((it) => {
      if (!isScheduledToday(it)) return;
      const mins = parseTime(it.time);
      if (mins === null) return;
      const delay = (mins - 15 - now) * 60000;
      if (delay <= 0 || delay > 12 * 3600000) return;
      timers.push(setTimeout(() => {
        once(`sched:${it.id}:${day}`, () => notify(t("appName"), nudgeText(it, lang, nameOf, t)));
        forceTick((n) => n + 1);
      }, delay));
    });
    return () => timers.forEach(clearTimeout);
  }, [interests, entries, photos, lang]);
}

export function askNotifications() {
  if (window.Notification && Notification.permission === "default") {
    try { Notification.requestPermission(); } catch (e) { /* ignore */ }
  }
}
