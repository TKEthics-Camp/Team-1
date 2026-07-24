import { entriesOf } from "./derived";
import { today } from "./dates";

export function minutesNow() {
  var d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function parseTime(hhmm) {
  var p = (hhmm || "").split(":");
  return p.length === 2 ? +p[0] * 60 + +p[1] : null;
}

// No days chosen means "every day" (also keeps existing trees, which predate
// this field, reminding as before).
export function isScheduledToday(it) {
  return !it.days || !it.days.length || it.days.includes(new Date().getDay());
}

// A nudge is due in the 15 minutes before the chosen time, if today is one of
// the chosen days, nothing was logged for that orb today, and the user
// hasn't waved it off (either for the whole day, or snoozed until some later
// timestamp — see UIContext's snoozeNudge).
export function dueNudges(interests, entries, dismissed) {
  var now = minutesNow();
  var nowMs = Date.now();
  return interests.filter((it) => {
    var d = dismissed[it.id];
    if (d === today()) return false; // dismissed for the whole day
    if (typeof d === "number" && d > nowMs) return false; // snoozed until later
    if (!it.time) return false;
    if (!isScheduledToday(it)) return false;
    var mins = parseTime(it.time);
    if (mins === null) return false;
    var lead = mins - now;
    if (lead < 0 || lead > 15) return false;
    return !entriesOf(entries, it.id).some((e) => e.date === today());
  });
}

export function nudgeHead(it, lang, nameOf) {
  return lang === "en" ? nameOf(it) + " at " + it.time : it.time + " " + nameOf(it);
}

export function nudgeSub(it, t) {
  var friends = (it.friends || []).filter(Boolean);
  if (!friends.length) return t("nudgeSolo");
  return t("askCome") + friends[0] + t("askCome2");
}

export function nudgeText(it, lang, nameOf, t) {
  return nudgeHead(it, lang, nameOf) + " — " + nudgeSub(it, t);
}
