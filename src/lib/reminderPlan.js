import { nudgeText } from "./reminders";
import { daysUntilDeath } from "./tree";
import { dateKey } from "./dates";

// What the iPhone app should have scheduled with the system, worked out
// from the garden as it is right now.
//
// In a browser, reminders can only fire while the tab is open
// (useReminderTimers). The iPhone app can hand them to iOS ahead of time
// instead, and iOS delivers them whether or not Forest is running. That
// means deciding in advance, so this plans a week ahead and is re-run every
// time anything changes: log a hobby and today's reminder for it disappears;
// open the app on any day and the week is planned again from there.
//
// Pure on purpose — no plugin, no clock of its own — so it can be tested.

export const REMINDER_HOUR = 17;    // 5 pm: after school, before dinner
const HORIZON_DAYS = 7;
const MAX_SCHEDULED = 60;           // iOS keeps at most 64 per app

function at(dayStart, offsetDays, hour) {
  const d = new Date(dayStart);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export function planReminders({ interests, entries, photos, nameOf, t, now = new Date(), hour = REMINDER_HOUR }) {
  const plan = [];
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const todayKey = dateKey(now);
  const loggedToday = new Set(
    entries.filter((e) => e.date === todayKey && !e.deletedAt).map((e) => e.interestId)
  );

  // 1) One reminder a day naming every hobby set for that day. Today leaves
  //    out whatever is already logged; later days can't know yet, and are
  //    re-planned the next time the app opens.
  for (let offset = 0; offset < HORIZON_DAYS; offset++) {
    const when = at(dayStart, offset, hour);
    if (when <= now) continue;
    const dow = when.getDay();
    const due = interests.filter((it) => {
      const scheduled = !it.days || !it.days.length || it.days.includes(dow);
      if (!scheduled) return false;
      return offset > 0 || !loggedToday.has(it.id);
    });
    if (!due.length) continue;
    plan.push({
      title: t("appName"),
      body: nudgeText(due, nameOf, t),
      at: when,
      path: due.length === 1 ? `/interest/${due[0].id}` : "/",
    });
  }

  // 2) A last warning the day before a tree dies, if nothing saves it first.
  //    Logging anything resets the clock, which re-plans this away.
  for (const it of interests) {
    const left = daysUntilDeath(it, entries, photos);
    if (left < 1) continue;
    const when = at(dayStart, left - 1, hour);
    if (when <= now) continue;
    plan.push({
      title: t("dyingTitle").replace("{name}", nameOf(it)),
      body: t("dyingOneDay"),
      at: when,
      path: `/interest/${it.id}`,
    });
  }

  plan.sort((a, b) => a.at - b.at);
  return plan.slice(0, MAX_SCHEDULED).map((p, i) => ({ ...p, id: i + 1 }));
}
