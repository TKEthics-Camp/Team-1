// Clearing data and retrying sync — the actions that act on the whole
// account rather than on one record.
import { put, clearAll as dbClearAll, clearGarden as dbClearGarden } from "../db/db";
import { deleteAllMine } from "../lib/remote";

/** @param {import("./storeContextTypes").StoreCtx} ctx */
export function createAccountActions(ctx) {
  const { setProfileState, setInterests, setPhotos, setEntries, setProfileCheck, setProfileCheckTick, userRef, sync } = ctx;

  return {
    // `alsoRemote` distinguishes "wipe this device's cache" (sign-out, on a
    // shared computer — the account's data must survive for next login)
    // from the Profile screen's "Clear all data" button, which promises to
    // erase everything and so must also delete the synced copy.
    // Signing out: wipe everything, profile included, so the next person on
    // a shared device doesn't inherit it. Nulling the profile is the point.
    clearAllData(alsoRemote = false) {
      if (alsoRemote && userRef.current) deleteAllMine(userRef.current.id);
      dbClearAll();
      setProfileState(null);
      setInterests([]);
      setPhotos([]);
      setEntries([]);
    },
    // "Clear all data" from Me: empties the garden, local and remote, but
    // keeps the profile. The account is still signed in and still onboarded
    // — and App renders <Onboarding/> whenever profile is null, so dropping
    // it here would send someone who just cleared their trees back through
    // the whole start flow.
    // Local first, so the screen empties the moment it's asked to, then the
    // server. Reports back whether the server half actually happened: it
    // used to be fired off unawaited with its errors going to the console,
    // so a failed wipe looked exactly like a successful one right up until
    // the next sign-in pulled everything back.
    //
    // Anything queued for retry cleans itself up without help — retryPending
    // drops any record that's gone from Dexie rather than re-pushing it.
    async clearGarden() {
      await dbClearGarden();
      setInterests([]);
      setPhotos([]);
      setEntries([]);
      // Badges are derived, so clearing takes them away — but the record of
      // which were already announced stayed full, and earning one again
      // afterwards passed without a word. Starting fresh, they're celebrated.
      setProfileState((p) => {
        if (!p) return p;
        const next = { ...p, earnedBadges: [] };
        put("meta", next);
        return next;
      });
      if (!userRef.current) return { ok: true };
      return { ok: await deleteAllMine(userRef.current.id) };
    },
    // A manual "try again now" for the sync-status indicator — runs the
    // exact same retry the background timer would, just on demand.
    retrySync() {
      sync.retryPending();
    },
    // Another go at the sign-in check, when it couldn't reach the server.
    retryProfileCheck() {
      setProfileCheck("checking");
      setProfileCheckTick((n) => n + 1);
    },
  };
}
