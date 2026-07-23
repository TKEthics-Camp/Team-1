// Day keys are LOCAL dates. toISOString() would shift them by the UTC offset,
// which silently breaks streaks for anyone east or west of Greenwich.
function p2(n) { return n < 10 ? "0" + n : "" + n; }

export function dateKey(d) {
  d = d || new Date();
  return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
}

export function today() { return dateKey(); }

export function keyToDate(k) {
  var p = k.split("-");
  return new Date(+p[0], +p[1] - 1, +p[2]);
}

export function keyDays(k) { return Math.round(keyToDate(k).getTime() / 86400000); }

export function fmtDate(iso, lang) {
  var d = new Date(iso + "T00:00:00");
  var now = new Date(); now.setHours(0, 0, 0, 0);
  var diff = Math.round((now - d) / 86400000);
  if (diff === 0) return lang === "en" ? "Today" : "今天";
  if (diff === 1) return lang === "en" ? "Yesterday" : "昨天";
  if (lang === "zh") return (d.getMonth() + 1) + "月" + d.getDate() + "日";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// "3 months ago" style relative time, for the home memory banner.
export function fmtRelative(at, lang) {
  var days = Math.floor((Date.now() - at) / 86400000);
  if (days <= 0) return lang === "en" ? "Today" : "今天";
  if (days === 1) return lang === "en" ? "Yesterday" : "昨天";
  if (days < 7) return lang === "en" ? days + "d ago" : days + "天前";
  if (days < 30) {
    var weeks = Math.round(days / 7);
    return lang === "en" ? weeks + "w ago" : weeks + "周前";
  }
  if (days < 365) {
    var months = Math.round(days / 30);
    return lang === "en" ? months + "mo ago" : months + "个月前";
  }
  var years = Math.round(days / 365);
  return lang === "en" ? years + "y ago" : years + "年前";
}

// Splits a journal entry's date into a bold "Jul 21" chip and a muted weekday.
export function fmtEntryDate(iso, lang) {
  var d = new Date(iso + "T00:00:00");
  if (lang === "zh") {
    return {
      day: (d.getMonth() + 1) + "月" + d.getDate() + "日",
      weekday: d.toLocaleDateString("zh-CN", { weekday: "long" }),
    };
  }
  return {
    day: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    weekday: d.toLocaleDateString("en-US", { weekday: "long" }),
  };
}

// "April 2026" / "2026年4月" — for Profile's "orb keeper since" line.
export function fmtMonthYear(at, lang) {
  var d = new Date(at);
  if (lang === "zh") return d.getFullYear() + "年" + (d.getMonth() + 1) + "月";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// Formats today's date pill for the entry sheet's date picker, e.g. "Today · Jul 21, 2026".
export function fmtDateFieldLabel(iso, lang) {
  var d = new Date(iso + "T00:00:00");
  var rel = fmtDate(iso, lang);
  var full = lang === "zh"
    ? d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return rel + " · " + full;
}
