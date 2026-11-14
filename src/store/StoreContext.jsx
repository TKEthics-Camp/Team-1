import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getAll, put, del, clearAll as dbClearAll, clearGarden as dbClearGarden } from "../db/db";
import { COINS_PER_LOG, DECORATIONS, REVIVE_COST, TRASH_DAYS, HAIR_STYLES, OUTFIT_STYLES } from "../lib/constants";
import { useAuth } from "./AuthContext";
import {
  deleteRemoteInterest, deleteRemoteEntry,
  deleteAllMine, pullMine, pullUserRow, updateDisplayName,
  joinClass as joinClassRemote, setMyClassCode,
  updateCoins, deleteRemotePhoto,
  updateOwnedDecorations, updateOwnedHair, updateOwnedOutfits,
  syncLoginToUsername, removeVoiceNoteFile,
} from "../lib/remote";
import { loadPendingSync, savePendingSync, forgetPendingSync } from "../lib/pendingSync";
import { loadSeen, forgetSeen, splitLocalOnly } from "../lib/seenRemote";
import { newerSide, mergePulled, touched } from "../lib/newestEdit";
import {
  isOnboarded, rebuildProfile, profileFromServer, applyNewer, addAdopted, settlePlan, byCreated,
} from "../lib/reconcile";
import { sweepTrash, trashList, trashedWith, untrash, DAY_MS } from "../lib/trash";
import { createSyncEngine } from "./syncEngine";

const StoreCtx = createContext(null);
const STORES = ["interests", "entries", "photos"];

export function StoreProvider({ children }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfileState] = useState(null);
  const [interests, setInterests] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [entries, setEntries] = useState([]);
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
      let hasLocalProfile = !!profileRef.current;
      if (hasLocalProfile && profileRef.current.userId && profileRef.current.userId !== user.id) {
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
          const next = { ...profileRef.current, ...patch };
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

  const actions = useMemo(() => {
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
    saveProfile(rec) {
      setProfileState(rec);
      put("meta", rec);
    },
    // Exposed so a one-time push outside these actions (Onboarding's own
    // lang/theme push at signup) gets the same tracked retry as every
    // other profile-field push here, instead of a bare, untracked call.
    pushProfileField: sync.pushProfileField,
    setLangOnProfile(lang) {
      setProfileState((p) => {
        if (!p) return p;
        const next = { ...p, lang };
        put("meta", next);
        return next;
      });
      if (userRef.current) sync.pushProfileField("lang", lang);
    },
    updateProfile(patch) {
      setProfileState((p) => {
        if (!p) return p;
        const next = { ...p, ...patch };
        put("meta", next);
        return next;
      });
      // Everything else this is used for (tour state...) is genuinely
      // local-only. Avatar, soundOn, and theme are fields here that need
      // to survive a sign-out — a device-wide privacy wipe, not an
      // account change — so they're the ones that get pushed.
      if (patch.avatar && userRef.current) sync.pushProfileField("avatar", patch.avatar);
      if ("soundOn" in patch && userRef.current) sync.pushProfileField("soundOn", patch.soundOn !== false);
      if (patch.theme && userRef.current) sync.pushProfileField("theme", patch.theme);
    },
    // Unlike setDiscoverable/updateProfile, this waits on the remote write
    // before touching local state — a username collision (users_display_
    // name_unique_idx) has to be known *before* the local profile commits to
    // the new name, or the UI would show a name that didn't actually save.
    async changeUsername(name) {
      const trimmed = (name || "").trim();
      if (!trimmed) return { ok: false, reason: "empty" };
      if (!userRef.current) return { ok: false, reason: "error" };
      const previous = profileRef.current && profileRef.current.name;
      const result = await updateDisplayName(userRef.current.id, trimmed);
      if (!result.ok) return { ok: false, reason: result.taken ? "taken" : "error" };
      // Takes the login with it, or the new name couldn't sign in. Both have
      // to land: a name that half-changed is worse than one that didn't.
      const login = await syncLoginToUsername(trimmed);
      if (!login.ok) {
        if (previous) await updateDisplayName(userRef.current.id, previous);
        return { ok: false, reason: login.taken ? "taken" : "error" };
      }
      setProfileState((p) => {
        if (!p) return p;
        const next = { ...p, name: trimmed };
        put("meta", next);
        return next;
      });
      return { ok: true };
    },
    // Same wait-before-commit shape as changeUsername: a code has to be
    // confirmed real before the local profile claims to be in that class,
    // or the UI would show a membership that never actually took.
    async joinClass(code) {
      const trimmed = (code || "").trim().toUpperCase();
      if (!trimmed) return { ok: false, reason: "empty" };
      if (userRef.current) {
        // join_class() validates the code and writes the membership in one
        // go, server-side — the client can't be trusted to check first,
        // since it could just skip the check and write the column itself.
        const result = await joinClassRemote(trimmed);
        if (result !== "joined") return { ok: false, reason: result };
      }
      setProfileState((p) => {
        if (!p) return p;
        const next = { ...p, classCode: trimmed };
        put("meta", next);
        return next;
      });
      return { ok: true };
    },
    // Opts this account into (or out of) Explore's user search. Off by
    // default (see the users_select RLS policy) — this is the only place
    // that flips it on.
    setDiscoverable(enabled) {
      setProfileState((p) => {
        if (!p) return p;
        const next = { ...p, discoverable: enabled };
        put("meta", next);
        return next;
      });
      if (userRef.current) sync.pushProfileField("discoverable", enabled);
    },
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
    // ------------------------------------------------ recently deleted
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
    // Returns true/false so the market screen can tell the user why a
    // purchase didn't go through (already owned vs. can't afford it).
    buyDecoration(id) {
      const p = profileRef.current;
      if (!p) return false;
      const deco = DECORATIONS.find((d) => d.id === id);
      if (!deco) return false;
      const owned = p.ownedDecorations || [];
      if (owned.includes(id) || (p.coins || 0) < deco.price) return false;
      const next = { ...p, coins: (p.coins || 0) - deco.price, ownedDecorations: [...owned, id] };
      setProfileState(next);
      put("meta", next);
      if (userRef.current) {
        updateCoins(userRef.current.id, next.coins);
        updateOwnedDecorations(userRef.current.id, next.ownedDecorations);
      }
      return true;
    },
    equipDecoration(id) {
      const p = profileRef.current;
      if (!p) return;
      if (id && !(p.ownedDecorations || []).includes(id)) return;
      const next = { ...p, equippedDecoration: id || null };
      setProfileState(next);
      put("meta", next);
      if (userRef.current) sync.pushProfileField("equippedDecoration", next.equippedDecoration);
    },
    // Unlocks a hair/outfit style for coins, then equips it. Free styles
    // (price 0) just equip straight away. Returns false if it can't afford
    // an unowned style — the sheet uses that to show "not enough coins".
    // Org accounts never earn coins (no hobbies/logging to earn them from),
    // so every style is free for them — otherwise a priced style would be
    // permanently unreachable rather than just costing something.
    buyAndEquipAvatarPart(kind, id) {
      const p = profileRef.current;
      if (!p) return false;
      const list = kind === "hair" ? HAIR_STYLES : OUTFIT_STYLES;
      const item = list.find((x) => x.id === id);
      if (!item) return false;
      const ownedKey = kind === "hair" ? "ownedHair" : "ownedOutfits";
      const owned = p[ownedKey] || [];
      const alreadyOwned = item.price === 0 || owned.includes(id) || p.accountType === "org";
      if (!alreadyOwned && (p.coins || 0) < item.price) return false;
      const next = {
        ...p,
        coins: alreadyOwned ? p.coins || 0 : (p.coins || 0) - item.price,
        [ownedKey]: alreadyOwned ? owned : [...owned, id],
      };
      setProfileState(next);
      put("meta", next);
      if (!alreadyOwned && userRef.current) {
        updateCoins(userRef.current.id, next.coins);
        if (kind === "hair") updateOwnedHair(userRef.current.id, next.ownedHair);
        else updateOwnedOutfits(userRef.current.id, next.ownedOutfits);
      }
      return true;
    },
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

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
