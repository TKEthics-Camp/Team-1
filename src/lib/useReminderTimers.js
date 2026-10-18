import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { nudgeText, dueNudges } from "./reminders";
import { treeHealth, isDyingSoon, daysUntilDeath } from "./tree";
import { today } from "./dates";

const isNative = Capacitor.isNativePlatform();

// The hour a same-day reminder fires at, if the app isn't open to catch it
// live. Picked once, arbitrarily, rather than exposed as a setting — this
// isn't the kind of thing worth a whole preferences screen for yet.
const REMINDER_HOUR = 18;

// Fire-once-per-day guard, module-scoped so it survives re-renders. Native
// scheduling additionally relies on this to avoid re-scheduling the same
// day's notification every time the effect re-runs (a fresh entry logged,
// a language switch) — see the id note below for what handles it if the
// app is closed and reopened later the same day, when this Set is gone.
const fired = new Set();
function once(key, fn) {
  if (fired.has(key)) return;
  fired.add(key);
  fn();
}

// A stable 31-bit id from the key string — Capacitor's local notifications
// need a number, and scheduling the same id again *replaces* the pending
// one rather than stacking a second. That's what keeps this idempotent
// across app restarts within the same day, when the in-memory `fired` Set
// above has already been wiped and would otherwise let a fresh mount
// schedule a duplicate.
function idFor(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % 0x7fffffff;
}

// On the web this fires immediately, same as always — there's a live tab to
// show it in. Wrapped as a native app, there's no background process to
// fire a JS timer later, so instead this *schedules* the notification with
// iOS itself: today at REMINDER_HOUR if that's still ahead, or a few
// seconds from now if the app happens to be opened after it (better late
// than never, and still a real native notification rather than nothing).
function notify(key, title, body) {
  if (isNative) {
    const now = new Date();
    const at = new Date(now);
    at.setHours(REMINDER_HOUR, 0, 0, 0);
    if (at <= now) at.setTime(now.getTime() + 5000);
    LocalNotifications.schedule({
      notifications: [{ id: idFor(key), title, body, schedule: { at } }],
    }).catch(() => { /* permission not granted, or plugin unavailable — nothing to fall back to */ });
    return;
  }
  if (window.Notification && Notification.permission === "granted") {
    try { new Notification(title, { body }); } catch (e) { /* ignore */ }
  }
}

// Drives every notification the app can send:
//   • one reminder a day naming every hobby still due (day of week only —
//     see dueNudges),
//   • a heads-up when a tree is drying out or has died.
// On the web this only ever runs while the tab is open — a no-server web
// app can't push in the background. Wrapped natively, notify() above
// schedules these with the OS instead of firing them directly, so they
// still arrive later the same day even if the app gets closed right after
// this effect runs.
export function useReminderTimers(interests, entries, photos, lang, nameOf, t) {
  useEffect(() => {
    const day = today();

    // 1) hobbies due today and not yet logged → one grouped notification/day
    const due = dueNudges(interests, entries, {});
    if (due.length) {
      const key = `due:${day}`;
      once(key, () => notify(key, t("appName"), nudgeText(due, nameOf, t)));
    }

    // 2) trees drying out or dead → a gentle heads-up (once/day each)
    interests.forEach((it) => {
      const h = treeHealth(it, entries, photos);
      // Ahead of the health tiers: a tree can be "bare" for days before it
      // dies, and the useful moment to say something is while there's still
      // time to act, not once it's already gone.
      if (h !== "dead" && isDyingSoon(it, entries, photos)) {
        const left = daysUntilDeath(it, entries, photos);
        const key = `dying:${it.id}:${day}`;
        once(key, () => notify(
          key,
          t("appName"),
          t("dyingTitle").replace("{name}", nameOf(it)) + " — " +
            (left === 1 ? t("dyingOneDay") : t("dyingDays").replace("{n}", left))
        ));
      }
      if (h === "wilting" || h === "bare") {
        const key = `dry:${it.id}:${day}`;
        once(key, () => notify(key, t("appName"), `${nameOf(it)} — ${t("hlWilting")}`));
      } else if (h === "dead") {
        const key = `dead:${it.id}:${day}`;
        once(key, () => notify(key, t("appName"), `${nameOf(it)} — ${t("hlDead")}`));
      }
    });
  }, [interests, entries, photos, lang]);
}

export function askNotifications() {
  if (isNative) {
    LocalNotifications.requestPermissions().catch(() => { /* ignore */ });
    return;
  }
  if (window.Notification && Notification.permission === "default") {
    try { Notification.requestPermission(); } catch (e) { /* ignore */ }
  }
}
