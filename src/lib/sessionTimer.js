// A running session: "I'm starting Guitar now." The student starts it, puts
// the phone down, and stops it when they're done — the time is then filled
// in on the log sheet for them.
//
// Only the start time is kept, never a ticking count: the elapsed time is
// worked out from the clock whenever it's needed, so the timer survives the
// app being closed, the phone sleeping, or the tab being thrown away.
//
// One session at a time, kept on this device only. It is cleared at sign-out
// (see App.jsx) so the next person on a shared device doesn't inherit it.

const KEY = "forest.session";

// A timer left running overnight shouldn't offer "14 hours of Guitar". Past
// this the suggestion stops growing; the student can still correct it.
export const MAX_SESSION_MINUTES = 480;

function storage() {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadSession(now = Date.now()) {
  const s = storage();
  if (!s) return null;
  try {
    const v = JSON.parse(s.getItem(KEY) || "null");
    if (!v || typeof v.interestId !== "string" || !Number.isFinite(v.startedAt)) return null;
    // A start time in the future is a changed clock or a damaged record.
    if (v.startedAt > now + 60000) return null;
    return { interestId: v.interestId, startedAt: v.startedAt };
  } catch {
    return null;
  }
}

export function saveSession(session) {
  const s = storage();
  if (!s) return;
  try {
    if (session) s.setItem(KEY, JSON.stringify(session));
    else s.removeItem(KEY);
  } catch {
    // The timer still runs for as long as the app stays open.
  }
}

export function clearSession() {
  saveSession(null);
}

export function elapsedMs(session, now = Date.now()) {
  return Math.max(0, now - session.startedAt);
}

// What to offer on the log sheet: at least a minute (a session that was
// started and stopped still happened), at most the cap.
export function sessionMinutes(session, now = Date.now()) {
  return Math.min(MAX_SESSION_MINUTES, Math.max(1, Math.round(elapsedMs(session, now) / 60000)));
}

// "4:07", "1:02:45"
export function fmtElapsed(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
