import { useEffect } from "react";
import { nudgeText, dueNudges } from "./reminders";
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

// Drives every notification the app can send (all while the tab is open — a
// no-server web app can't push in the background):
//   • one reminder a day naming every hobby still due (day of week only —
//     see dueNudges),
//   • a heads-up when a tree is drying out or has died.
export function useReminderTimers(interests, entries, photos, lang, nameOf, t) {
  useEffect(() => {
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
  if (window.Notification && Notification.permission === "default") {
    try { Notification.requestPermission(); } catch (e) { /* ignore */ }
  }
}
