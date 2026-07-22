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

// A nudge is due in the 90 minutes before the chosen time, if nothing was
// logged for that orb today and the user hasn't waved it off.
export function dueNudges(interests, entries, dismissed) {
  var now = minutesNow();
  return interests.filter((it) => {
    if (!it.time || dismissed[it.id] === today()) return false;
    var mins = parseTime(it.time);
    if (mins === null) return false;
    var lead = mins - now;
    if (lead < 0 || lead > 90) return false;
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
