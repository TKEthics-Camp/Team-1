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
