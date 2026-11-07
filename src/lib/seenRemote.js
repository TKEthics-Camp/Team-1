// Which records this device knows the server has had — kept so sign-in sync
// can tell two kinds of "here but not on the server" apart:
//
//   never reached it    made offline, or its push failed: upload it
//   reached it, gone    erased on another device (Erase now, the 30-day
//                       sweep, Clear all data): erase it here too
//
// Reconciling used to treat both as the first kind, so a tree erased on a
// laptop came straight back from the phone that still had it cached.
//
// Keys are "<store>:<id>", the same shape as lib/pendingSync's, and the list
// is saved per account with the same guards: losing it only ever means
// falling back to uploading, never to erasing something that wasn't erased.

const PREFIX = "forest.seenRemote.";

function storage() {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadSeen(userId) {
  const s = storage();
  if (!s || !userId) return new Set();
  try {
    const parsed = JSON.parse(s.getItem(PREFIX + userId) || "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((k) => typeof k === "string" && k.includes(":")) : []);
  } catch {
    return new Set();
  }
}

export function saveSeen(userId, keys) {
  const s = storage();
  if (!s || !userId) return;
  try {
    s.setItem(PREFIX + userId, JSON.stringify(Array.from(keys)));
  } catch {
    // Nothing to do: next time, the missing list just means uploading.
  }
}

export function forgetSeen(userId) {
  const s = storage();
  if (!s || !userId) return;
  try {
    s.removeItem(PREFIX + userId);
  } catch {
    // As above.
  }
}

// Splits this device's records that the server doesn't have into the ones
// to upload and the ones to erase. `complete` says whether the server's list
// came back whole: a partial pull proves nothing about what's missing, so
// then everything uploads, exactly as before.
export function splitLocalOnly(store, localRows, remoteRows, seen, complete) {
  const onServer = new Set(remoteRows.map((r) => r.id));
  const push = [], drop = [];
  localRows.forEach((r) => {
    if (onServer.has(r.id)) return;
    if (complete && seen.has(store + ":" + r.id)) drop.push(r);
    else push.push(r);
  });
  return { push, drop };
}
