import { useEffect, useState } from "react";
import { nudgeText, dueNudges } from "./reminders";
import { planReminders } from "./reminderPlan";
import {
  isNative, replaceScheduledReminders, requestNotificationPermission, onPermissionChange,
} from "./notifications";
import { treeHealth, isDyingSoon, daysUntilDeath } from "./tree";
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

// Drives every notification the app can send:
//   • one reminder a day naming every hobby still due (day of week only —
//     see dueNudges),
//   • a heads-up when a tree is drying out or has died.
//
// In a browser these fire only while the tab is open — a no-server web app
// can't push in the background. Inside the iPhone app they are handed to
// iOS a week ahead instead (see reminderPlan), and re-planned whenever the
// garden, the language or the permission changes.
export function useReminderTimers(interests, entries, photos, lang, nameOf, t) {
  const [permissionTick, setPermissionTick] = useState(0);
  useEffect(() => onPermissionChange(() => setPermissionTick((n) => n + 1)), []);

  useEffect(() => {
    if (!isNative()) return undefined;
    // Saving a journal entry touches entries and interests in quick
    // succession; one plan for the lot is enough.
    const timer = setTimeout(() => {
      replaceScheduledReminders(planReminders({ interests, entries, photos, nameOf, t }));
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interests, entries, photos, lang, permissionTick]);

  useEffect(() => {
    if (isNative()) return;
    const day = today();

    // 1) hobbies due today and not yet logged → one grouped notification/day
    const due = dueNudges(interests, entries, {});
    if (due.length) {
      once(`due:${day}`, () => notify(t("appName"), nudgeText(due, nameOf, t)));
    }

    // 2) trees drying out or dead → a gentle heads-up (once/day each)
    interests.forEach((it) => {
      const h = treeHealth(it, entries, photos);
      // Ahead of the health tiers: a tree can be "bare" for days before it
      // dies, and the useful moment to say something is while there's still
      // time to act, not once it's already gone.
      if (h !== "dead" && isDyingSoon(it, entries, photos)) {
        const left = daysUntilDeath(it, entries, photos);
        once(`dying:${it.id}:${day}`, () => notify(
          t("appName"),
          t("dyingTitle").replace("{name}", nameOf(it)) + " — " +
            (left === 1 ? t("dyingOneDay") : t("dyingDays").replace("{n}", left))
        ));
      }
      if (h === "wilting" || h === "bare") {
        once(`dry:${it.id}:${day}`, () => notify(t("appName"), `${nameOf(it)} — ${t("hlWilting")}`));
      } else if (h === "dead") {
        once(`dead:${it.id}:${day}`, () => notify(t("appName"), `${nameOf(it)} — ${t("hlDead")}`));
      }
    });
  }, [interests, entries, photos, lang]);
}

export function askNotifications() {
  return requestNotificationPermission();
}
