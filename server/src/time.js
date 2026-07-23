// Local-time helpers, keyed off the IANA timezone string each device reports
// (e.g. "America/Los_Angeles") — every check below runs in *that* zone, not
// the server's, so "7pm" means 7pm for the person, wherever they are.

export function localParts(tz, date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz || "UTC",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    dayKey: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: (+parts.hour % 24) * 60 + +parts.minute,
  };
}

export function dayKeyOffset(dayKey, deltaDays) {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

export function parseTime(hhmm) {
  const p = (hhmm || "").split(":");
  return p.length === 2 ? +p[0] * 60 + +p[1] : null;
}

// 0 = Sunday .. 6 = Saturday, matching Date#getDay(). A calendar date's
// weekday is the same everywhere regardless of timezone, so this only needs
// the already-resolved local dayKey, not another Intl call.
export function dayOfWeek(dayKey) {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
