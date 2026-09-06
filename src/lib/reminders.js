import { entriesOf } from "./derived";
import { today } from "./dates";

// No days chosen means "every day" (also keeps existing trees, which predate
// this field, reminding as before).
export function isScheduledToday(it) {
  return !it.days || !it.days.length || it.days.includes(new Date().getDay());
}

// A nudge is due for the rest of the day if today is one of the chosen
// days, nothing was logged for that orb today, and the user hasn't waved it
// off (either for the whole day, or snoozed until some later timestamp —
// see UIContext's snoozeNudge).
export function dueNudges(interests, entries, dismissed) {
  var nowMs = Date.now();
  return interests.filter((it) => {
    var d = dismissed[it.id];
    if (d === today()) return false; // dismissed for the whole day
    if (typeof d === "number" && d > nowMs) return false; // snoozed until later
    if (!isScheduledToday(it)) return false;
    return !entriesOf(entries, it.id).some((e) => e.date === today());
  });
}

export function nudgeSub(it, t) {
  var friends = (it.friends || []).filter(Boolean);
  if (!friends.length) return t("nudgeSolo");
  return t("askCome") + friends[0] + t("askCome2");
}

// Plain-text summary for the one system notification a day covering
// everything still due (see dueNudges — day of week only, no time of day).
export function nudgeText(due, nameOf, t) {
  if (due.length === 1) return nameOf(due[0]) + " — " + nudgeSub(due[0], t);
  return t("nudgeManyTitle") + ": " + due.map(nameOf).join(", ");
}
