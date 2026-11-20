// Actions on what a student plants and logs: trees, photos and journal
// entries. The screen changes first; this device's copy and the server
// follow. Deleting hides at once and hands back commit/restore, so the
// caller can offer Undo (see UIContext's offerUndo).
import { put } from "../db/db";
import { COINS_PER_LOG, REVIVE_COST } from "../lib/constants";
import { updateCoins, removeVoiceNoteFile } from "../lib/remote";
import { touched } from "../lib/newestEdit";
import { byCreated } from "../lib/reconcile";

/** @param {import("./storeContextTypes").StoreCtx} ctx */
export function createGardenActions(ctx) {
  const { setProfileState, setInterests, setPhotos, setEntries, profileRef, userRef, sync } = ctx;

  function bumpCoins(delta) {
    setProfileState((p) => {
      if (!p) return p;
      const next = { ...p, coins: (p.coins || 0) + delta };
      put("meta", next);
      if (userRef.current) updateCoins(userRef.current.id, next.coins);
      return next;
    });
  }

  return {
    addInterest(rec) {
      setInterests((list) => [...list, rec]);
      put("interests", rec);
      if (userRef.current) sync.pushInterest(rec, userRef.current.id);
    },
    updateInterest(rec) {
      rec = touched(rec);
      setInterests((list) => list.map((x) => (x.id === rec.id ? rec : x)));
      put("interests", rec);
      if (userRef.current) sync.pushInterest(rec, userRef.current.id);
    },
    // Bring a dead tree back for REVIVE_COST coins. Returns false (and changes
    // nothing) if the user can't afford it. revivedAt resets the decay clock.
    // revivedAt syncs with the tree (revived_at), and coins sync too (see
    // updateCoins).
    reviveInterest(id) {
      const p = profileRef.current;
      if (!p || (p.coins || 0) < REVIVE_COST) return false;
      setInterests((list) => list.map((x) => {
        if (x.id !== id) return x;
        const next = { ...x, revivedAt: Date.now(), updatedAt: Date.now() };
        put("interests", next);
        if (userRef.current) sync.pushInterest(next, userRef.current.id);
        return next;
      }));
      const np = { ...p, coins: (p.coins || 0) - REVIVE_COST };
      setProfileState(np);
      put("meta", np);
      if (userRef.current) updateCoins(userRef.current.id, np.coins);
      return true;
    },
    // Removes the tree from view immediately, but doesn't actually delete
    // anything yet — returns `commit` (the real, permanent delete) and
    // `restore` (put everything back) so the caller can offer an Undo
    // window before calling `commit`. See UIContext's offerUndo.
    deleteInterest(id) {
      let removedInterest = null, removedEntries = [], removedPhotos = [];
      setInterests((list) => {
        removedInterest = list.find((x) => x.id === id) || null;
        return list.filter((x) => x.id !== id);
      });
      setEntries((list) => {
        removedEntries = list.filter((e) => e.interestId === id);
        return list.filter((e) => e.interestId !== id);
      });
      setPhotos((list) => {
        removedPhotos = list.filter((p) => p.interestId === id);
        return list.filter((p) => p.interestId !== id);
      });
      return {
        record: removedInterest,
        commit() {
          // Soft, locally and remotely: every row keeps deletedAt instead
          // of being removed, so Recently Deleted can offer it back on any
          // of this account's devices for TRASH_DAYS — see the sweep
          // effect and purgeTrashed for where they're actually destroyed.
          const at = Date.now();
          if (removedInterest) {
            const trashed = { ...removedInterest, deletedAt: at, updatedAt: at };
            put("interests", trashed);
            if (userRef.current) sync.pushInterest(trashed, userRef.current.id);
          }
          removedEntries.forEach((e) => {
            const trashed = { ...e, deletedAt: at, updatedAt: at };
            put("entries", trashed);
            if (userRef.current) sync.pushEntry(trashed);
          });
          removedPhotos.forEach((p) => {
            const trashed = { ...p, deletedAt: at, updatedAt: at };
            put("photos", trashed);
            if (userRef.current) sync.pushPhotoRow(trashed);
          });
        },
        restore() {
          if (!removedInterest) return;
          setInterests((list) => (list.some((x) => x.id === id) ? list : [...list, removedInterest].sort(byCreated)));
          setEntries((list) => [...list, ...removedEntries.filter((e) => !list.some((x) => x.id === e.id))]);
          setPhotos((list) => [...list, ...removedPhotos.filter((p) => !list.some((x) => x.id === p.id))]);
        },
      };
    },
    addPhoto(rec) {
      // Exactly one cover per tree, the same rule as setCoverPhoto below.
      setPhotos((list) => [...(rec.isPinned ? list.map((p) => {
        if (p.interestId !== rec.interestId || !p.isPinned) return p;
        const next = touched({ ...p, isPinned: false });
        put("photos", next);
        if (userRef.current) sync.pushPhotoRow(next);
        return next;
      }) : list), rec]);
      put("photos", rec);
      bumpCoins(COINS_PER_LOG);
      // The row goes up right away (caption/visibility/etc. are cheap);
      // the actual bytes upload separately and the row gets storage_path
      // filled in once that finishes, so a slow upload never blocks the
      // rest of the photo's data from syncing. One after the other: equal
      // stamps are allowed through (20261017010000), so a first push landing
      // late would blank the path the second one just set.
      if (userRef.current) {
        const userId = userRef.current.id;
        sync.pushPhotoRow(rec)
          .then(() => sync.uploadPhotoFile(rec, userId))
          .catch((err) => console.error("Sync (upload photo) threw:", err));
      }
    },
    // Exactly one cover per tree, so pinning a new one unpins whatever held
    // it before. Passing the same id again clears it, which falls the cover
    // back to the tree's first photo.
    setCoverPhoto(interestId, photoId) {
      setPhotos((list) => list.map((p) => {
        if (p.interestId !== interestId) return p;
        const isPinned = p.id === photoId && !p.isPinned;
        if (isPinned === !!p.isPinned) return p;
        const next = touched({ ...p, isPinned });
        put("photos", next);
        if (userRef.current) sync.pushPhotoRow(next);
        return next;
      }));
    },
    updatePhotoCaption(id, caption) {
      setPhotos((list) => list.map((p) => {
        if (p.id !== id) return p;
        const next = touched({ ...p, caption });
        put("photos", next);
        if (userRef.current) sync.pushPhotoRow(next);
        return next;
      }));
    },
    // Caches a blob fetched from Storage (see lib/image.js's usePhotoURL)
    // back onto the local record, so an own photo that had to be
    // downloaded once doesn't need downloading again next time.
    cachePhotoBlob(id, blob) {
      setPhotos((list) => list.map((p) => {
        if (p.id !== id || p.blob) return p;
        const next = { ...p, blob };
        put("photos", next);
        return next;
      }));
    },
    // Same idea as cachePhotoBlob, for a voice note downloaded from Storage
    // (see lib/image.js's useAudioURL).
    cacheEntryAudio(id, blob) {
      setEntries((list) => list.map((e) => {
        if (e.id !== id || e.audio) return e;
        const next = { ...e, audio: blob };
        put("entries", next);
        return next;
      }));
    },
    // Same optimistic-hide-then-commit-or-restore shape as deleteInterest.
    deletePhoto(id) {
      let removed = null;
      setPhotos((list) => {
        removed = list.find((p) => p.id === id) || null;
        return list.filter((p) => p.id !== id);
      });
      return {
        record: removed,
        // Soft delete, synced, same as interests/entries — recoverable
        // from Recently Deleted for TRASH_DAYS before the sweep drops it
        // for real, locally and remotely.
        commit() {
          if (removed) {
            const trashed = touched({ ...removed, deletedAt: Date.now() });
            put("photos", trashed);
            if (userRef.current) sync.pushPhotoRow(trashed);
          }
        },
        restore() {
          if (!removed) return;
          setPhotos((list) => (list.some((p) => p.id === id) ? list : [...list, removed]));
        },
      };
    },
    addEntry(rec) {
      setEntries((list) => [...list, rec]);
      put("entries", rec);
      bumpCoins(COINS_PER_LOG);
      // Same shape as addPhoto: the row goes up right away, and a voice
      // note's bytes upload separately, patching audio_path in once that
      // finishes so a slow upload never blocks the rest of the entry.
      if (userRef.current) {
        const userId = userRef.current.id;
        sync.pushEntry(rec)
          .then(() => (rec.audio ? sync.uploadEntryAudio(rec, userId) : null))
          .catch((err) => console.error("Sync (upload audio) threw:", err));
      }
    },
    // Edits an existing entry in place — no coin bump, this isn't new
    // activity, just a correction to something already logged. `previous` is
    // the entry as it stood, for finding a recording that was just removed.
    updateEntry(rec, previous) {
      rec = touched(rec);
      setEntries((list) => list.map((x) => (x.id === rec.id ? rec : x)));
      put("entries", rec);
      if (userRef.current) {
        const userId = userRef.current.id;
        // A re-recorded (or first-time, on an entry that predates syncing)
        // voice note needs uploading too — same path as addEntry. One already
        // in Storage doesn't: removing a note is the only way to replace it,
        // and that clears the path.
        sync.pushEntry(rec)
          .then(() => (rec.audio && !rec.audioPath ? sync.uploadEntryAudio(rec, userId) : null))
          .catch((err) => console.error("Sync (upload audio) threw:", err));
        // Storage has no cascade: taking the note off the entry left the
        // recording sitting in the bucket for as long as the account lasted.
        if (previous && previous.audioPath && !rec.audio && !rec.audioPath) {
          removeVoiceNoteFile(previous.audioPath);
        }
      }
    },
    // Same optimistic-hide-then-commit-or-restore shape as deletePhoto —
    // entries were the only deletable thing without an undo window.
    deleteEntry(id) {
      let removed = null;
      setEntries((list) => {
        removed = list.find((e) => e.id === id) || null;
        return list.filter((x) => x.id !== id);
      });
      return {
        record: removed,
        commit() {
          if (removed) {
            const trashed = touched({ ...removed, deletedAt: Date.now() });
            put("entries", trashed);
            if (userRef.current) sync.pushEntry(trashed);
          }
        },
        restore() {
          if (!removed) return;
          setEntries((list) => (list.some((e) => e.id === id) ? list : [...list, removed]));
        },
      };
    },
  };
}
