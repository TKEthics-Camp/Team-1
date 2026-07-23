import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getAll, put, del, clearAll as dbClearAll } from "../db/db";
import { COINS_PER_LOG, DECORATIONS, REVIVE_COST, PALETTE, DEFAULT_THEME } from "../lib/constants";
import { useAuth } from "./AuthContext";
import {
  pushInterest, deleteRemoteInterest, pushEntry, deleteRemoteEntry,
  deleteAllMine, pullMine, pullUserRow,
} from "../lib/remote";

const StoreCtx = createContext(null);

export function StoreProvider({ children }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfileState] = useState(null);
  const [interests, setInterests] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [entries, setEntries] = useState([]);

  // buyDecoration/equipDecoration need to read+validate the *current* profile
  // synchronously (to report success/failure back to the caller), which the
  // setState-updater pattern used elsewhere here can't do.
  const profileRef = useRef(profile);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  // Actions read this instead of `user` directly so the memoized action
  // functions below don't need `user` in their dep array to stay fresh.
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    Promise.all([getAll("meta"), getAll("interests"), getAll("photos"), getAll("entries")])
      .then(([meta, ints, ph, en]) => {
        setProfileState(meta.find((m) => m.key === "profile") || null);
        setInterests(ints.sort((a, b) => a.createdAt - b.createdAt));
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

  // Two-way reconcile with Supabase, once per sign-in: local interests/entries
  // that aren't on the server yet get claimed (pushed) under this account;
  // server rows that aren't cached locally (e.g. a second device, or this
  // browser after a sign-out wiped its cache) get adopted. Runs once loading
  // the local cache is done, so it never races the initial Dexie read.
  const reconciledForRef = useRef(null);
  useEffect(() => {
    // Without this, signing out and back in as the *same* user (no reload
    // in between — the component never remounts) would see the guard below
    // still pointing at that user's id from before sign-out, and skip
    // reconciling entirely on the way back in.
    if (!user) reconciledForRef.current = null;
  }, [user]);
  useEffect(() => {
    if (loading || !user || reconciledForRef.current === user.id) return;
    reconciledForRef.current = user.id;

    (async () => {
      // A signed-out cache wipe clears the local `profile` record too, which
      // is what App.jsx uses to decide Onboarding vs. the real app — without
      // this, a returning user would be sent through onboarding again every
      // time they log back in on a cleared cache. `users.display_name` is
      // only ever set once onboarding finishes, so a non-empty value there
      // means "this account already exists" and its profile can be rebuilt
      // straight from that row instead.
      if (!profileRef.current) {
        const userRow = await pullUserRow(user.id);
        if (userRow && userRow.display_name) {
          const rebuilt = {
            key: "profile",
            name: userRow.display_name,
            lang: "en",
            color: PALETTE[0],
            theme: DEFAULT_THEME,
            accountType: userRow.account_type || "individual",
            coins: 0,
            ownedDecorations: [],
            equippedDecoration: null,
            createdAt: new Date(userRow.created_at).getTime(),
          };
          setProfileState(rebuilt);
          put("meta", rebuilt);
        }
      }

      const [localInterests, localEntries, remote] = await Promise.all([
        getAll("interests"), getAll("entries"), pullMine(user.id),
      ]);

      const remoteIntIds = new Set(remote.interests.map((i) => i.id));
      const toPush = localInterests.filter((i) => !remoteIntIds.has(i.id));
      await Promise.all(toPush.map((rec) => pushInterest(rec, user.id)));

      const localIntIds = new Set(localInterests.map((i) => i.id));
      const toAdopt = remote.interests.filter((i) => !localIntIds.has(i.id));
      await Promise.all(toAdopt.map((rec) => put("interests", rec)));

      const remoteEntryIds = new Set(remote.entries.map((e) => e.id));
      const entriesToPush = localEntries.filter((e) => !remoteEntryIds.has(e.id));
      await Promise.all(entriesToPush.map((rec) => pushEntry(rec)));

      const localEntryIds = new Set(localEntries.map((e) => e.id));
      const entriesToAdopt = remote.entries.filter((e) => !localEntryIds.has(e.id));
      await Promise.all(entriesToAdopt.map((rec) => put("entries", rec)));

      if (toAdopt.length) {
        setInterests((list) => {
          const ids = new Set(list.map((i) => i.id));
          return [...list, ...toAdopt.filter((i) => !ids.has(i.id))].sort((a, b) => a.createdAt - b.createdAt);
        });
      }
      if (entriesToAdopt.length) {
        setEntries((list) => {
          const ids = new Set(list.map((e) => e.id));
          return [...list, ...entriesToAdopt.filter((e) => !ids.has(e.id))];
        });
      }
    })();
  }, [user, loading]);

  const actions = useMemo(() => {
    function bumpCoins(delta) {
      setProfileState((p) => {
        if (!p) return p;
        const next = { ...p, coins: (p.coins || 0) + delta };
        put("meta", next);
        return next;
      });
    }

    return {
    saveProfile(rec) {
      setProfileState(rec);
      put("meta", rec);
    },
    setLangOnProfile(lang) {
      setProfileState((p) => {
        if (!p) return p;
        const next = { ...p, lang };
        put("meta", next);
        return next;
      });
    },
    updateProfile(patch) {
      setProfileState((p) => {
        if (!p) return p;
        const next = { ...p, ...patch };
        put("meta", next);
        return next;
      });
    },
    addInterest(rec) {
      setInterests((list) => [...list, rec]);
      put("interests", rec);
      if (userRef.current) pushInterest(rec, userRef.current.id);
    },
    updateInterest(rec) {
      setInterests((list) => list.map((x) => (x.id === rec.id ? rec : x)));
      put("interests", rec);
      if (userRef.current) pushInterest(rec, userRef.current.id);
    },
    // Bring a dead tree back for REVIVE_COST coins. Returns false (and changes
    // nothing) if the user can't afford it. revivedAt resets the decay clock.
    // revivedAt/coins are a local-only game mechanic, not part of the synced
    // schema — the push here just keeps updated_at fresh remotely.
    reviveInterest(id) {
      const p = profileRef.current;
      if (!p || (p.coins || 0) < REVIVE_COST) return false;
      setInterests((list) => list.map((x) => {
        if (x.id !== id) return x;
        const next = { ...x, revivedAt: Date.now(), updatedAt: Date.now() };
        put("interests", next);
        if (userRef.current) pushInterest(next, userRef.current.id);
        return next;
      }));
      const np = { ...p, coins: (p.coins || 0) - REVIVE_COST };
      setProfileState(np);
      put("meta", np);
      return true;
    },
    deleteInterest(id) {
      setPhotos((list) => {
        list.filter((p) => p.interestId === id).forEach((p) => del("photos", p.id));
        return list.filter((p) => p.interestId !== id);
      });
      setEntries((list) => {
        list.filter((e) => e.interestId === id).forEach((e) => del("entries", e.id));
        return list.filter((e) => e.interestId !== id);
      });
      setInterests((list) => list.filter((x) => x.id !== id));
      del("interests", id);
      // Deleting the interest remotely cascades to its entries/photos server-side.
      if (userRef.current) deleteRemoteInterest(id);
    },
    // Photos stay local-only for now (still a Blob, not yet a Storage
    // upload) — see src/lib/remote.js for why that's a separate follow-up.
    addPhoto(rec) {
      setPhotos((list) => [...list, rec]);
      put("photos", rec);
      bumpCoins(COINS_PER_LOG);
    },
    deletePhoto(id) {
      setPhotos((list) => list.filter((x) => x.id !== id));
      del("photos", id);
    },
    addEntry(rec) {
      setEntries((list) => [...list, rec]);
      put("entries", rec);
      bumpCoins(COINS_PER_LOG);
      if (userRef.current) pushEntry(rec);
    },
    deleteEntry(id) {
      setEntries((list) => list.filter((x) => x.id !== id));
      del("entries", id);
      if (userRef.current) deleteRemoteEntry(id);
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
      return true;
    },
    equipDecoration(id) {
      const p = profileRef.current;
      if (!p) return;
      if (id && !(p.ownedDecorations || []).includes(id)) return;
      const next = { ...p, equippedDecoration: id || null };
      setProfileState(next);
      put("meta", next);
    },
    // `alsoRemote` distinguishes "wipe this device's cache" (sign-out, on a
    // shared computer — the account's data must survive for next login)
    // from the Profile screen's "Clear all data" button, which promises to
    // erase everything and so must also delete the synced copy.
    clearAllData(alsoRemote = false) {
      if (alsoRemote && userRef.current) deleteAllMine(userRef.current.id);
      dbClearAll();
      setProfileState(null);
      setInterests([]);
      setPhotos([]);
      setEntries([]);
    },
    };
  }, []);

  const value = useMemo(
    () => ({ loading, profile, interests, photos, entries, ...actions }),
    [loading, profile, interests, photos, entries, actions]
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
