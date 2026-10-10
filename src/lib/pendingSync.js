// The list of records that still owe the server a successful push, kept
// across app restarts so a failed edit is not forgotten the moment the app
// closes. See the sync-status comment in StoreContext.
//
// Only keys are stored ("entries:<id>", "profile:theme" …), never the
// records themselves: the retry always reads the current local copy, so
// what goes up is the latest edit rather than whatever the record looked
// like when it first failed.
//
// Keyed per account, so a second student on the same device never retries
// the first one's edits under their own session. Every access is guarded:
// storage can be missing or refuse writes (private browsing, full disk), and
// losing this list must only ever mean falling back to the old in-memory
// behaviour, never breaking the app.

const PREFIX = "forest.pendingSync.";

function storage() {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadPendingSync(userId) {
  const s = storage();
  if (!s || !userId) return [];
  try {
    const parsed = JSON.parse(s.getItem(PREFIX + userId) || "[]");
    return Array.isArray(parsed) ? parsed.filter((k) => typeof k === "string" && k.includes(":")) : [];
  } catch {
    return [];
  }
}

export function savePendingSync(userId, keys) {
  const s = storage();
  if (!s || !userId) return;
  try {
    const list = Array.from(keys);
    if (list.length) s.setItem(PREFIX + userId, JSON.stringify(list));
    else s.removeItem(PREFIX + userId);
  } catch {
    // Nothing to do: the in-memory list still drives this session's retries.
  }
}

export function forgetPendingSync(userId) {
  const s = storage();
  if (!s || !userId) return;
  try {
    s.removeItem(PREFIX + userId);
  } catch {
    // As above.
  }
}
