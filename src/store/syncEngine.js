// Pushing records to the server and keeping track of what still owes it a
// push. Built once per StoreProvider (see createSyncEngine's caller), so the
// functions here keep one identity for the life of the app: effects and the
// memoized actions can depend on them without re-running.
//
// Every push re-sends the whole current record rather than a diff, so a
// retry just means "push whatever the record looks like now". Only *which*
// records still owe the server a successful push is remembered: keys of
// the form "<store>:<id>", or "profile:<field>" for a profile setting. The
// list is saved per account (lib/pendingSync), so closing the app before a
// retry lands doesn't lose the edit.
import * as db from "../db/db";
import * as remoteApi from "../lib/remote";
import { saveSeen } from "../lib/seenRemote";
import { DEFAULT_THEME } from "../lib/constants";

/**
 * @param {object} deps
 * @param {{ current: any }} deps.userRef        signed-in user, or null
 * @param {{ current: any }} deps.profileRef     current profile
 * @param {{ current: Set<string> }} deps.pendingSyncRef
 * @param {{ current: { userId: string|null, keys: Set<string> } }} deps.seenRef
 * @param {(fn: (prev: Set<string>) => Set<string>) => void} deps.setPendingSyncIds
 * @param {(fn: (list: any[]) => any[]) => void} deps.setPhotos
 * @param {(fn: (list: any[]) => any[]) => void} deps.setEntries
 * @param {any} [deps.local]   Dexie wrapper (get/put/getAll); injectable for tests
 * @param {any} [deps.remote]  lib/remote; injectable for tests
 */
export function createSyncEngine({
  userRef, profileRef, pendingSyncRef, seenRef,
  setPendingSyncIds, setPhotos, setEntries,
  local = db, remote = remoteApi,
}) {
  let seenSaveTimer = null;

  // Records the server has confirmed it holds (lib/seenRemote), written back
  // a moment after they change rather than once per push.
  function markSeen(store, id) {
    const seen = seenRef.current;
    if (!seen.userId) return;
    seen.keys.add(store + ":" + id);
    clearTimeout(seenSaveTimer);
    seenSaveTimer = setTimeout(() => saveSeen(seen.userId, seen.keys), 500);
  }

  function markSyncResult(store, id, ok) {
    const key = store + ":" + id;
    setPendingSyncIds((prev) => {
      if (prev.has(key) === !ok) return prev;
      const next = new Set(prev);
      if (ok) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function pushInterest(rec, userId) {
    const ok = await remote.pushInterest(rec, userId);
    markSyncResult("interests", rec.id, ok);
    if (ok) markSeen("interests", rec.id);
    return ok;
  }
  // A row whose bytes haven't reached Storage still owes the server
  // something, even when the row itself landed: signing out wipes the only
  // copy of those bytes. Counting it as pending is what gets the upload
  // retried, and what makes logging out warn about it.
  async function pushEntry(rec) {
    const ok = await remote.pushEntry(rec);
    markSyncResult("entries", rec.id, ok && !(rec.audio && !rec.audioPath));
    if (ok) markSeen("entries", rec.id);
    return ok;
  }
  async function pushPhotoRow(rec) {
    const ok = await remote.pushPhotoRow(rec);
    markSyncResult("photos", rec.id, ok && !(rec.blob && !rec.storagePath));
    if (ok) markSeen("photos", rec.id);
    return ok;
  }

  // Upload the bytes, then push the row with the path filled in. Whatever
  // happened to the record during the upload wins over the copy this started
  // from: it may have been edited, trashed, or (no copy left) erased, and
  // writing the original back would undo that.
  async function uploadPhotoFile(rec, userId) {
    const storagePath = await remote.uploadPhotoBlob(userId, rec.id, rec.blob);
    const cur = await local.get("photos", rec.id);
    if (!cur) return;
    if (!storagePath) { await pushPhotoRow(cur); return; }
    const next = { ...cur, storagePath };
    await local.put("photos", next);
    setPhotos((list) => list.map((p) => (p.id === rec.id ? { ...p, storagePath } : p)));
    await pushPhotoRow(next);
  }
  // Same for a voice note, which unlike a photo can also have been taken off
  // the entry while it was uploading.
  async function uploadEntryAudio(rec, userId) {
    const audioPath = await remote.uploadAudioBlob(userId, rec.id, rec.audio);
    const cur = await local.get("entries", rec.id);
    if (!cur) return;
    if (!audioPath || !cur.audio) { await pushEntry(cur); return; }
    const next = { ...cur, audioPath };
    await local.put("entries", next);
    setEntries((list) => list.map((e) => (e.id === rec.id ? { ...e, audioPath } : e)));
    await pushEntry(next);
  }

  // An entry or photo, whichever way it needs: bytes first if they haven't
  // gone up yet, otherwise just the row.
  function pushEntryOrAudio(rec, userId) {
    return rec.audio && !rec.audioPath ? uploadEntryAudio(rec, userId) : pushEntry(rec);
  }
  function pushPhotoOrFile(rec, userId) {
    return rec.blob && !rec.storagePath ? uploadPhotoFile(rec, userId) : pushPhotoRow(rec);
  }

  // Profile settings that sync. Each reads the value it is given, which the
  // caller takes from the current profile at push time — a retry never
  // sends a stale snapshot. Anything not listed here is local-only.
  const PROFILE_FIELD_PUSH = {
    discoverable: (id, v) => remote.updateDiscovery(id, !!v),
    soundOn: (id, v) => remote.updateSoundOn(id, v !== false),
    lang: (id, v) => remote.updateLang(id, v || "en"),
    theme: (id, v) => remote.updateTheme(id, v || DEFAULT_THEME),
    equippedDecoration: (id, v) => remote.updateEquippedDecoration(id, v || null),
    avatar: (id, v) => remote.updateAvatar(id, v || {}),
  };
  async function pushProfileField(field, value) {
    const user = userRef.current;
    if (!user || !PROFILE_FIELD_PUSH[field]) return false;
    const ok = await PROFILE_FIELD_PUSH[field](user.id, value);
    markSyncResult("profile", field, ok);
    return ok;
  }

  // Retries whatever's still pending, using each record's current Dexie
  // copy. Runs on a timer, when the connection comes back, after sign-in
  // sync, and on demand from the sync indicator.
  async function retryPending() {
    const keys = Array.from(pendingSyncRef.current);
    const user = userRef.current;
    if (!keys.length || !user) return;
    const [ints, ents, phs] = await Promise.all([
      local.getAll("interests"), local.getAll("entries"), local.getAll("photos"),
    ]);
    const byStore = {
      interests: new Map(ints.map((r) => [r.id, r])),
      entries: new Map(ents.map((r) => [r.id, r])),
      photos: new Map(phs.map((r) => [r.id, r])),
    };
    for (const key of keys) {
      const sep = key.indexOf(":");
      const store = key.slice(0, sep), id = key.slice(sep + 1);
      if (store === "profile") {
        const p = profileRef.current;
        if (!p || !PROFILE_FIELD_PUSH[id]) { markSyncResult(store, id, true); continue; }
        await pushProfileField(id, p[id]);
        continue;
      }
      const rec = byStore[store] && byStore[store].get(id);
      // Gone locally since (deleted for real, or already restored/erased):
      // nothing left to retry, so stop tracking it.
      if (!rec) { markSyncResult(store, id, true); continue; }
      if (store === "interests") await pushInterest(rec, user.id);
      else if (store === "entries") await pushEntryOrAudio(rec, user.id);
      else await pushPhotoOrFile(rec, user.id);
    }
  }

  return {
    markSeen, markSyncResult,
    pushInterest, pushEntry, pushPhotoRow,
    uploadPhotoFile, uploadEntryAudio, pushEntryOrAudio, pushPhotoOrFile,
    pushProfileField, retryPending,
  };
}
