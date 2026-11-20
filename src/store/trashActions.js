// Recently Deleted: listing it, putting things back, and erasing them early.
// Trashed rows live only in this device's database (and the server's), never
// in the lists on screen — see lib/trash for the rules.
import { getAll, put, del } from "../db/db";
import { TRASH_DAYS } from "../lib/constants";
import { deleteRemoteInterest, deleteRemoteEntry, deleteRemotePhoto } from "../lib/remote";
import { touched } from "../lib/newestEdit";
import { byCreated } from "../lib/reconcile";
import { trashList, trashedWith, untrash, DAY_MS } from "../lib/trash";

/** @param {import("./storeContextTypes").StoreCtx} ctx */
export function createTrashActions(ctx) {
  const { setInterests, setPhotos, setEntries, userRef, sync } = ctx;

  return {
    // Read straight from Dexie rather than kept in state: trashed rows are
    // deliberately absent from interests/photos/entries so nothing else has
    // to learn to skip them, and this list is only ever looked at on demand.
    async listTrash() {
      const [ints, ph, en] = await Promise.all([
        getAll("interests"), getAll("photos"), getAll("entries"),
      ]);
      return trashList(ints, ph, en, Date.now() - TRASH_DAYS * DAY_MS);
    },
    async restoreTrashed(kind, id) {
      // Stamped as a fresh edit: the trashed copy on the server carries the
      // time it was deleted, and an older stamp would be refused there
      // (keep_newest_edit, 20261017010000) — the restore would never land.
      const strip = (r) => untrash(r, touched);
      if (kind === "interest") {
        const [ints, ph, en] = await Promise.all([getAll("interests"), getAll("photos"), getAll("entries")]);
        const it = ints.find((x) => x.id === id);
        if (!it) return;
        const back = strip(it);
        put("interests", back);
        setInterests((list) => (list.some((x) => x.id === id) ? list : [...list, back].sort(byCreated)));
        // Its children trashed in the same breath return too — only those
        // (see trashedWith); one deleted on its own stays in the bin.
        const kids = (rows) => trashedWith(rows, it).map(strip);
        const backPh = kids(ph), backEn = kids(en);
        backPh.forEach((r) => put("photos", r));
        backEn.forEach((r) => put("entries", r));
        setPhotos((list) => [...list, ...backPh.filter((r) => !list.some((x) => x.id === r.id))]);
        setEntries((list) => [...list, ...backEn.filter((r) => !list.some((x) => x.id === r.id))]);
        if (userRef.current) {
          sync.pushInterest(back, userRef.current.id);
          backEn.forEach((r) => sync.pushEntry(r));
          backPh.forEach((r) => sync.pushPhotoRow(r));
        }
        return;
      }
      const store = kind === "photo" ? "photos" : "entries";
      const rows = await getAll(store);
      const rec = rows.find((r) => r.id === id);
      if (!rec) return;
      const back = strip(rec);
      put(store, back);
      if (kind === "photo") {
        setPhotos((l) => (l.some((x) => x.id === id) ? l : [...l, back]));
        if (userRef.current) sync.pushPhotoRow(back);
      } else {
        setEntries((l) => (l.some((x) => x.id === id) ? l : [...l, back]));
        if (userRef.current) sync.pushEntry(back);
      }
    },
    // The one place anything is actually destroyed early, on request —
    // for real, locally and remotely, rather than waiting out the rest of
    // the TRASH_DAYS window for the sweep to do it.
    async purgeTrashed(kind, id) {
      if (kind === "interest") {
        const [ph, en] = await Promise.all([getAll("photos"), getAll("entries")]);
        const kidPhotos = ph.filter((p) => p.interestId === id);
        const kidEntries = en.filter((e) => e.interestId === id);
        kidPhotos.forEach((p) => del("photos", p.id));
        kidEntries.forEach((e) => del("entries", e.id));
        del("interests", id);
        // Rows cascade remotely — entries/photos reference interests on
        // delete cascade — but files don't. "Erase now" has to mean the
        // photos and recordings too, so each child goes through the call
        // that removes its file before the tree goes.
        if (userRef.current) {
          await Promise.all([
            ...kidPhotos.map((p) => deleteRemotePhoto(p.id, p.storagePath)),
            ...kidEntries.map((e) => deleteRemoteEntry(e.id, e.audioPath)),
          ]);
          deleteRemoteInterest(id);
        }
        return;
      }
      if (kind === "photo") {
        const rows = await getAll("photos");
        const rec = rows.find((r) => r.id === id);
        del("photos", id);
        if (userRef.current) deleteRemotePhoto(id, rec && rec.storagePath);
        return;
      }
      const rows = await getAll("entries");
      const rec = rows.find((r) => r.id === id);
      del("entries", id);
      if (userRef.current) deleteRemoteEntry(id, rec && rec.audioPath);
    },
  };
}
