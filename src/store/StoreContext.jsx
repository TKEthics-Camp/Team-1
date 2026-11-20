import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getAll, put, del, clearAll as dbClearAll } from "../db/db";
import { TRASH_DAYS } from "../lib/constants";
import { useAuth } from "./AuthContext";
import {
  deleteRemoteInterest, deleteRemoteEntry, deleteRemotePhoto,
  pullMine, pullUserRow, updateDisplayName, setMyClassCode, updateCoins,
  updateOwnedDecorations, updateOwnedHair, updateOwnedOutfits, syncLoginToUsername,
} from "../lib/remote";
import { loadPendingSync, savePendingSync, forgetPendingSync } from "../lib/pendingSync";
import { loadSeen, forgetSeen, splitLocalOnly } from "../lib/seenRemote";
import { newerSide, mergePulled } from "../lib/newestEdit";
import {
  isOnboarded, rebuildProfile, profileFromServer, applyNewer, addAdopted, settlePlan, byCreated,
} from "../lib/reconcile";
import { sweepTrash, DAY_MS } from "../lib/trash";
import { createSyncEngine } from "./syncEngine";
import { createProfileActions } from "./profileActions";
import { createGardenActions } from "./gardenActions";
import { createTrashActions } from "./trashActions";
import { createAccountActions } from "./accountActions";

const StoreCtx = createContext(/** @type {ReturnType<typeof useStoreValue> | null} */ (null));
const STORES = ["interests", "entries", "photos"];

export function StoreProvider({ children }) {
  return <StoreCtx.Provider value={useStoreValue()}>{children}</StoreCtx.Provider>;
}

function useStoreValue() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfileState] = useState(/** @type {import("../lib/types").Profile | null} */ (null));
  const [interests, setInterests] = useState(/** @type {import("../lib/types").Interest[]} */ ([]));
  const [photos, setPhotos] = useState(/** @type {import("../lib/types").Photo[]} */ ([]));
  const [entries, setEntries] = useState(/** @type {import("../lib/types").Entry[]} */ ([]));
  // Whether this sign-in has settled what to do about a device with no
  // profile on it: "checking" until the server has answered, "done" once
  // profile is either rebuilt or known not to exist, "failed" if it could
  // not be asked. App holds Onboarding back until "done" — see the reconcile
  // effect for why.
  const [profileCheck, setProfileCheck] = useState("checking");
  const [profileCheckTick, setProfileCheckTick] = useState(0);

  // buyDecoration/equipDecoration need to read+validate the *current* profile
  // synchronously (to report success/failure back to the caller), which the
  // setState-updater pattern used elsewhere here can't do.
  const profileRef = useRef(profile);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  // Actions read this instead of `user` directly so the memoized action
  // functions below don't need `user` in their dep array to stay fresh.
  // The debug skip-auth user is deliberately excluded: it isn't a real
  // Supabase session, so every push/delete against the real project would
  // just fail RLS and spam the console.
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user && user.isDebug ? null : user; }, [user]);

  // Which records still owe the server a push (see syncEngine). Retrying
  // failed *updates* is what this adds over reconciliation, which only
  // compares IDs and so never sends an edit to a record the server has.
  const [pendingSyncIds, setPendingSyncIds] = useState(() => new Set());
  const pendingSyncRef = useRef(pendingSyncIds);
  useEffect(() => { pendingSyncRef.current = pendingSyncIds; }, [pendingSyncIds]);

  // Which account's saved list is loaded. Writing is held off until the
  // load has happened, or the empty set every session starts with would
  // overwrite the list it was about to read.
  const pendingLoadedForRef = useRef(null);
  useEffect(() => {
    if (!user || user.isDebug) {
      // Signing out wipes the local records these keys point at, so the
      // list means nothing any more — for this device or the next person.
      if (pendingLoadedForRef.current) forgetPendingSync(pendingLoadedForRef.current);
      pendingLoadedForRef.current = null;
      setPendingSyncIds((prev) => (prev.size ? new Set() : prev));
      return;
    }
    if (pendingLoadedForRef.current === user.id) return;
    const saved = loadPendingSync(user.id);
    pendingLoadedForRef.current = user.id;
    if (saved.length) setPendingSyncIds((prev) => new Set([...prev, ...saved]));
  }, [user]);
  useEffect(() => {
    const id = pendingLoadedForRef.current;
    if (id) savePendingSync(id, pendingSyncIds);
  }, [pendingSyncIds]);

  // Which records the server has confirmed it holds (see lib/seenRemote):
  // what lets sign-in sync tell a record erased on another device from one
  // that simply hasn't been uploaded yet. Loaded per account like the
  // pending list, and forgotten at sign-out along with everything it
  // describes.
  const seenRef = useRef({ userId: null, keys: new Set() });
  useEffect(() => {
    const prev = seenRef.current.userId;
    if (!user || user.isDebug) {
      if (prev) forgetSeen(prev);
      seenRef.current = { userId: null, keys: new Set() };
      return;
    }
    if (prev !== user.id) seenRef.current = { userId: user.id, keys: loadSeen(user.id) };
  }, [user]);

  // Built once: everything it reads is a ref or a state setter, so one copy
  // stays correct for the life of the provider.
  const [sync] = useState(() => createSyncEngine({
    userRef, profileRef, pendingSyncRef, seenRef, setPendingSyncIds, setPhotos, setEntries,
  }));

  // Retry what's pending on a timer while the app is open, and the moment
  // the browser regains a connection.
  useEffect(() => {
    const retry = () => { sync.retryPending(); };
    const timer = setInterval(retry, 45000);
    window.addEventListener("online", retry);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", retry);
    };
  }, [sync]);

  useEffect(() => {
    Promise.all([getAll("meta"), getAll("interests"), getAll("photos"), getAll("entries")])
      .then(([meta, ints, ph, en]) => {
        // Deleting sets deletedAt rather than removing the row, so it can be
        // put back from Recently Deleted. Everything past the window is
        // dropped for real here — the one place that runs on every start.
        // The remote copy carries the same tombstone, so it's purged too —
        // best-effort only, since the signed-in user isn't always known yet
        // this early in a fresh mount.
        const cutoff = Date.now() - TRASH_DAYS * DAY_MS;
        const sweep = (rows, store, purgeRemote) => {
          const { keep, expired } = sweepTrash(rows, cutoff);
          expired.forEach((r) => {
            del(store, r.id);
            if (userRef.current) purgeRemote(r);
          });
          return keep;
        };
        ints = sweep(ints, "interests", (r) => deleteRemoteInterest(r.id));
        ph = sweep(ph, "photos", (r) => deleteRemotePhoto(r.id, r.storagePath));
        en = sweep(en, "entries", (r) => deleteRemoteEntry(r.id, r.audioPath));

        setProfileState(meta.find((m) => m.key === "profile") || null);
        setInterests(ints.sort(byCreated));
        setPhotos(ph);
        // Entries written before durations existed get a nominal half hour,
        // once, so old logs still contribute to the hours shown on an orb.
        en.forEach((e) => {
          if (typeof e.minutes !== "number") { e.minutes = 30; put("entries", e); }
        });
        setEntries(en);
        setLoading(false);
      })
      .catch((e) => {
        console.error("Storage unavailable:", e);
        setLoading(false);
      });
  }, []);

  // Two-way reconcile with Supabase, once per sign-in: local records that
  // aren't on the server yet get claimed (pushed) under this account; server
  // rows that aren't cached locally (a second device, or this browser after
  // a sign-out wiped its cache) get adopted; records both have take the
  // newer edit. Runs once loading the local cache is done, so it never
  // races the initial Dexie read. The decisions themselves live in
  // lib/reconcile, where they're tested.
  const reconciledForRef = useRef(null);
  useEffect(() => {
    // Signing out and back in as the same user (no reload, no remount)
    // would otherwise find the guard below still set, and skip reconciling.
    if (!user) {
      reconciledForRef.current = null;
      setProfileCheck("checking");
    } else if (user.isDebug) {
      setProfileCheck("done");
    }
  }, [user]);
  useEffect(() => {
    if (loading || !user || user.isDebug || reconciledForRef.current === user.id) return;
    reconciledForRef.current = user.id;

    (async () => {
      const [userRow, remote] = await Promise.all([pullUserRow(user.id), pullMine(user.id)]);

      // Signed out while that was on its way: this device's copy has been
      // wiped, and nothing below may write the account back into it.
      if (reconciledForRef.current !== user.id) return;

      // A cached profile belongs to whoever was signed in here last. A
      // different account signing in on top of it (switching accounts, a
      // shared device) must not inherit their name, garden or theme — same
      // local-only wipe as signing out, triggered by the mismatch.
      const cachedProfile = profileRef.current;
      let hasLocalProfile = !!cachedProfile;
      if (cachedProfile && cachedProfile.userId && cachedProfile.userId !== user.id) {
        await dbClearAll();
        profileRef.current = null;
        setProfileState(null);
        setInterests([]);
        setPhotos([]);
        setEntries([]);
        hasLocalProfile = false;
      }

      // Nothing on this device and no answer from the server says nothing
      // about whether this account is new. Treating it as new sent a
      // returning student through Onboarding on any network blip, and
      // finishing that overwrote their real settings and coins. So: stop,
      // say so, and let App offer another try.
      if (!hasLocalProfile && !userRow) {
        reconciledForRef.current = null;
        setProfileCheck("failed");
        return;
      }

      if (!hasLocalProfile) {
        // A returning account on a wiped device gets its profile back from
        // the server; a new one goes on to Onboarding.
        if (isOnboarded(userRow, remote)) {
          const rebuilt = rebuildProfile(userRow, remote, user.id);
          profileRef.current = rebuilt;
          setProfileState(rebuilt);
          put("meta", rebuilt);
        }
      } else if (userRow) {
        const { patch, push } = profileFromServer(
          profileRef.current, userRow, user.id,
          (field) => pendingSyncRef.current.has("profile:" + field),
        );
        if (Object.keys(patch).length) {
          const next = /** @type {import("../lib/types").Profile} */ ({ ...profileRef.current, ...patch });
          profileRef.current = next;
          setProfileState(next);
          put("meta", next);
        }
        if (push.ownedDecorations) updateOwnedDecorations(user.id, push.ownedDecorations);
        if (push.ownedHair) updateOwnedHair(user.id, push.ownedHair);
        if (push.ownedOutfits) updateOwnedOutfits(user.id, push.ownedOutfits);
        if (push.coins != null) updateCoins(user.id, push.coins);
        if (push.classCode) setMyClassCode(push.classCode);
        if (push.displayName) updateDisplayName(user.id, push.displayName);
      }
      setProfileCheck("done");

      // A student renamed before renames moved the login address can only
      // sign in with their old username. This moves the address to match
      // the name they have, so the new name (and a recovery code) works.
      // Does nothing for an address that already matches, or for an
      // educator's real email.
      if (userRow && userRow.display_name) syncLoginToUsername(userRow.display_name);

      const [localInterests, localEntries, localPhotos] = await Promise.all(STORES.map((s) => getAll(s)));
      const localRows = { interests: localInterests, entries: localEntries, photos: localPhotos };
      const setters = { interests: setInterests, entries: setEntries, photos: setPhotos };

      // Of what this device has and the server doesn't, the records the
      // server had confirmed before were erased there since (lib/seenRemote)
      // and go here too. The rest were never uploaded, and go up now.
      // Trashed rows carry their deletedAt like any other field, so pushing
      // one syncs the tombstone rather than resurrecting it.
      const seen = seenRef.current.userId === user.id ? seenRef.current.keys : new Set();
      const split = {};
      for (const store of STORES) {
        split[store] = splitLocalOnly(store, localRows[store], remote[store], seen, remote.complete);
        const erased = new Set(split[store].drop.map((r) => r.id));
        erased.forEach((id) => { del(store, id); sync.markSyncResult(store, id, true); });
        if (erased.size) setters[store]((l) => l.filter((r) => !erased.has(r.id)));
        // Everything the server just handed back is, by definition, on it.
        remote[store].forEach((r) => sync.markSeen(store, r.id));
      }

      // Up: interests first, so entries and photos have a tree to point at.
      // A local-only entry or photo might never have got its bytes to
      // Storage either (recorded offline), so those upload first.
      await Promise.all(split.interests.push.map((rec) => sync.pushInterest(rec, user.id)));
      await Promise.all(split.entries.push.map((rec) => sync.pushEntryOrAudio(rec, user.id)));
      await Promise.all(split.photos.push.map((rec) => sync.pushPhotoOrFile(rec, user.id)));

      // Down: rows only the server has.
      const adopted = {};
      for (const store of STORES) {
        const localIds = new Set(localRows[store].map((r) => r.id));
        adopted[store] = remote[store].filter((r) => !localIds.has(r.id));
        await Promise.all(adopted[store].map((rec) => put(store, rec)));
      }

      // Both sides: the newer edit wins. The server refuses a stale push on
      // its own (20261017010000); this pulls a newer copy down, and pushes a
      // newer local one up.
      const pushNewer = {
        interests: (r) => sync.pushInterest(r, user.id),
        entries: sync.pushEntry,
        photos: sync.pushPhotoRow,
      };
      const newer = {};
      for (const store of STORES) {
        const plan = settlePlan(localRows[store], remote[store], newerSide);
        newer[store] = plan.pull.map(({ local, remote: r }) => mergePulled(store, local, r));
        await Promise.all([
          ...newer[store].map((rec) => put(store, rec)),
          ...plan.push.map((rec) => pushNewer[store](rec)),
        ]);
      }

      // Into what's on screen.
      for (const store of STORES) {
        const sort = store === "interests" ? (l) => l.sort(byCreated) : (l) => l;
        if (newer[store].length || adopted[store].length) {
          setters[store]((l) => sort(addAdopted(applyNewer(l, newer[store]), adopted[store])));
        }
      }

      // Bytes that never made it up on a row the server already has. The
      // row's arrival made it look finished, so nothing went back for the
      // file — and the next sign-out destroyed the only copy.
      const [latestPhotos, latestEntries] = await Promise.all([getAll("photos"), getAll("entries")]);
      const pushing = new Set([...split.photos.push, ...split.entries.push].map((r) => r.id));
      await Promise.all([
        ...latestPhotos.filter((p) => p.blob && !p.storagePath && !pushing.has(p.id)).map((p) => sync.uploadPhotoFile(p, user.id)),
        ...latestEntries.filter((e) => e.audio && !e.audioPath && !pushing.has(e.id)).map((e) => sync.uploadEntryAudio(e, user.id)),
      ]);

      // Edits that failed last time the app was open — now, rather than
      // waiting 45 seconds for the timer, so a student who opens the app,
      // glances and closes it again still gets them up.
      sync.retryPending();
    })();
  }, [user, loading, profileCheckTick, sync]);

  // The actions screens call, in four groups (profile, garden, trash,
  // account). Built once: they read refs and setters only, so one copy stays
  // correct for the life of the provider.
  const actions = useMemo(() => {
    const ctx = {
      setProfileState, setInterests, setPhotos, setEntries, setProfileCheck, setProfileCheckTick,
      profileRef, userRef, sync,
    };
    return {
      ...createProfileActions(ctx),
      ...createGardenActions(ctx),
      ...createTrashActions(ctx),
      ...createAccountActions(ctx),
    };
  }, [sync]);

  // An entry or photo only counts while its tree does. One logged on this
  // device under a tree that was deleted on another stays stored (it can come
  // back with the tree from Recently Deleted), but it no longer adds to
  // streaks, badges, totals or the year in review for a tree that's gone.
  const liveEntries = useMemo(() => {
    const ids = new Set(interests.map((i) => i.id));
    return entries.every((e) => ids.has(e.interestId)) ? entries : entries.filter((e) => ids.has(e.interestId));
  }, [interests, entries]);
  const livePhotos = useMemo(() => {
    const ids = new Set(interests.map((i) => i.id));
    return photos.every((p) => ids.has(p.interestId)) ? photos : photos.filter((p) => ids.has(p.interestId));
  }, [interests, photos]);

  const value = useMemo(
    () => ({ loading, profile, interests, photos: livePhotos, entries: liveEntries, profileCheck, pendingSyncCount: pendingSyncIds.size, ...actions }),
    [loading, profile, interests, livePhotos, liveEntries, profileCheck, pendingSyncIds, actions]
  );
  return value;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// The profile, for screens behind the router — App only mounts those once
// there is one (and RoutedShell renders nothing in the moment a sign-out
// clears it), so they can read it without checking for null each time.
export function useProfile() {
  return /** @type {import("../lib/types").Profile} */ (useStore().profile);
}
