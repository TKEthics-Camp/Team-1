import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getAll, put, del, clearAll as dbClearAll, clearGarden as dbClearGarden } from "../db/db";
import { COINS_PER_LOG, DECORATIONS, REVIVE_COST, PALETTE, DEFAULT_THEME, TRASH_DAYS, HAIR_STYLES, OUTFIT_STYLES } from "../lib/constants";
import { useAuth } from "./AuthContext";
import {
  pushInterest as remotePushInterest, deleteRemoteInterest, pushEntry as remotePushEntry, deleteRemoteEntry,
  deleteAllMine, pullMine, pullUserRow, updateDiscovery, updateDisplayName,
  classCodeExists, joinClass as joinClassRemote, setMyClassCode, updateAvatar,
  parseAvatar, pushPhotoRow as remotePushPhotoRow, uploadPhotoBlob, updateCoins, deleteRemotePhoto,
  updateSoundOn, updateOwnedDecorations, updateEquippedDecoration, updateOwnedHair, updateOwnedOutfits,
  updateLang, updateTheme,
} from "../lib/remote";
import { earnedIds } from "../lib/badges";

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
  // The debug skip-auth user is deliberately excluded: it isn't a real
  // Supabase session, so every push/delete against the real project would
  // just fail RLS and spam the console.
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user && user.isDebug ? null : user; }, [user]);

  // Sync status: a lightweight stand-in for a full offline queue. Every
  // push already re-sends the whole current record rather than a diff, so
  // "retry" just means "call the same push again later with whatever the
  // record looks like now" — no need to remember what specifically
  // changed, only which records still owe the server a successful push.
  // Kept in memory only (not persisted to Dexie): if the app is fully
  // closed before a retry lands, the next sign-in's reconciliation still
  // picks up brand-new records the same way it always has, and a fresh
  // edit re-triggers a push on its own anyway. What this adds is retrying
  // failed *updates* to something that already exists remotely, which
  // reconciliation alone never covered.
  const [pendingSyncIds, setPendingSyncIds] = useState(() => new Set());
  const pendingSyncRef = useRef(pendingSyncIds);
  useEffect(() => { pendingSyncRef.current = pendingSyncIds; }, [pendingSyncIds]);

  function markSyncResult(store, id, ok) {
    const key = store + ":" + id;
    setPendingSyncIds((prev) => {
      const isPending = prev.has(key);
      if (isPending === !ok) return prev;
      const next = new Set(prev);
      if (ok) next.delete(key); else next.add(key);
      return next;
    });
  }
  async function pushInterest(rec, userId) {
    const ok = await remotePushInterest(rec, userId);
    markSyncResult("interests", rec.id, ok);
    return ok;
  }
  async function pushEntry(rec) {
    const ok = await remotePushEntry(rec);
    markSyncResult("entries", rec.id, ok);
    return ok;
  }
  async function pushPhotoRow(rec) {
    const ok = await remotePushPhotoRow(rec);
    markSyncResult("photos", rec.id, ok);
    return ok;
  }

  // Retries whatever's still pending, using each record's current Dexie
  // copy (never a stale snapshot from whenever it first failed) — on a
  // timer while the app is open, and the moment the browser regains a
  // connection. retryPendingRef lets the exposed retrySync action (a
  // manual "try again now" from the UI) trigger the exact same logic
  // on demand instead of waiting for the next tick.
  const retryPendingRef = useRef(() => {});
  useEffect(() => {
    async function retryPending() {
      const keys = Array.from(pendingSyncRef.current);
      if (!keys.length || !userRef.current) return;
      const [ints, ents, phs] = await Promise.all([
        getAll("interests"), getAll("entries"), getAll("photos"),
      ]);
      const byStore = { interests: ints, entries: ents, photos: phs };
      for (const key of keys) {
        const sep = key.indexOf(":");
        const store = key.slice(0, sep), id = key.slice(sep + 1);
        const rec = byStore[store].find((r) => r.id === id);
        // Gone locally since (deleted for real, or already restored/
        // erased) — nothing left to retry, so stop tracking it.
        if (!rec) { markSyncResult(store, id, true); continue; }
        if (store === "interests") await pushInterest(rec, userRef.current.id);
        else if (store === "entries") await pushEntry(rec);
        else await pushPhotoRow(rec);
      }
    }
    retryPendingRef.current = retryPending;
    const timer = setInterval(retryPending, 45000);
    window.addEventListener("online", retryPending);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", retryPending);
    };
  }, []);

  useEffect(() => {
    Promise.all([getAll("meta"), getAll("interests"), getAll("photos"), getAll("entries")])
      .then(([meta, ints, ph, en]) => {
        // Deleting sets deletedAt rather than removing the row, so it can be
        // put back from Recently Deleted. Everything past the window is
        // dropped for real here — the one place that runs on every start.
        // The remote copy carries the same tombstone (see deleteInterest/
        // deleteEntry/deletePhoto), so it's purged for real here too —
        // best-effort only, since the signed-in user isn't always known
        // yet this early in a fresh mount.
        const cutoff = Date.now() - TRASH_DAYS * 86400000;
        const sweep = (rows, store, purgeRemote) => {
          const keep = [];
          rows.forEach((r) => {
            if (!r.deletedAt) { keep.push(r); return; }
            if (r.deletedAt < cutoff) {
              del(store, r.id);
              if (userRef.current) purgeRemote(r);
            }
          });
          return keep;
        };
        ints = sweep(ints, "interests", (r) => deleteRemoteInterest(r.id));
        ph = sweep(ph, "photos", (r) => deleteRemotePhoto(r.id, r.storagePath));
        en = sweep(en, "entries", (r) => deleteRemoteEntry(r.id));

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
    if (loading || !user || user.isDebug || reconciledForRef.current === user.id) return;
    reconciledForRef.current = user.id;

    (async () => {
      // A signed-out cache wipe clears the local `profile` record too, which
      // is what App.jsx uses to decide Onboarding vs. the real app — without
      // this, a returning user would be sent through onboarding again every
      // time they log back in on a cleared cache. `users.display_name` is
      // only ever set once onboarding finishes, so a non-empty value there
      // means "this account already exists" and its profile can be rebuilt
      // straight from that row instead.
      const [userRow, remote] = await Promise.all([pullUserRow(user.id), pullMine(user.id)]);

      // A cached local profile only ever belongs to whoever was signed in on
      // this device last — nothing here is scoped per-account. If a *different*
      // account signs in on top of it (no explicit sign-out in between — e.g.
      // switching accounts, or another person's session on a shared device),
      // that stranger's name/garden/theme would otherwise bleed straight into
      // this session. Once we know for certain it's not this account's data,
      // drop it before doing anything else — same local-only wipe as signing
      // out, just triggered by a mismatch instead.
      let hasLocalProfile = !!profileRef.current;
      if (hasLocalProfile && profileRef.current.userId && profileRef.current.userId !== user.id) {
        await dbClearAll();
        setProfileState(null);
        setInterests([]);
        setPhotos([]);
        setEntries([]);
        hasLocalProfile = false;
      }

      if (!hasLocalProfile) {
        // onboarding_completed, not display_name — AuthFlow sets display_name
        // at signup already (to reserve the username before onboarding even
        // starts), so it stopped meaning "finished onboarding" the moment
        // that shipped. Without this, every fresh signup looked
        // pre-onboarded and skipped straight past it.
        //
        // The column is only present once its migration has been applied,
        // though, and a project without it read `undefined` here — falsy —
        // so *every* returning user looked un-onboarded and got sent back
        // through the start flow on login. Tell "column missing" apart from
        // "genuinely false" and fall back to the things that only exist
        // once onboarding has actually run: a planted tree, or an
        // educator's class code. display_name can't serve, for the reason
        // above.
        const hasFlag = !!userRow && Object.prototype.hasOwnProperty.call(userRow, "onboarding_completed");
        const onboarded = !userRow ? false
          : hasFlag ? !!userRow.onboarding_completed
          : (remote.interests.length > 0 || !!userRow.class_code);
        if (onboarded) {
          // Interests/entries/photos only land in local state further down
          // this same effect (after the push/adopt round-trip below), well
          // after this profile commits — useBadgeWatcher would otherwise
          // see this profile against an empty garden, lock that in as
          // "nothing earned yet", and then re-announce every badge you
          // actually have the moment the real data arrives. Seeding the
          // real baseline here, from what was already just pulled down,
          // avoids that false "zero" moment entirely. Trashed rows don't
          // count — the live badge count they'll be compared against never
          // includes them either.
          const live = (rows) => rows.filter((r) => !r.deletedAt);
          const rebuilt = {
            key: "profile",
            name: userRow.display_name,
            lang: userRow.lang || "en",
            color: PALETTE[0],
            theme: userRow.theme || DEFAULT_THEME,
            accountType: userRow.account_type || "individual",
            discoverable: !!userRow.discovery_enabled,
            classCode: userRow.class_code || null,
            avatar: parseAvatar(userRow.avatar) || {},
            coins: userRow.coins || 0,
            ownedDecorations: userRow.owned_decorations || [],
            equippedDecoration: userRow.equipped_decoration || null,
            ownedHair: userRow.owned_hair || [],
            ownedOutfits: userRow.owned_outfits || [],
            earnedBadges: earnedIds(live(remote.interests), live(remote.entries), live(remote.photos)),
            createdAt: new Date(userRow.created_at).getTime(),
            soundOn: userRow.sound_on !== false,
            userId: user.id,
          };
          setProfileState(rebuilt);
          put("meta", rebuilt);
        }
      } else if (userRow) {
        // Picks up a discoverable change made from another device/session —
        // the local profile cache doesn't otherwise learn about remote-only
        // updates.
        if (!!profileRef.current.discoverable !== !!userRow.discovery_enabled) {
          const next = { ...profileRef.current, discoverable: !!userRow.discovery_enabled };
          setProfileState(next);
          put("meta", next);
        }
        // Same for sound — it used to be local-only and silently reset to
        // on after any sign-out; now it's remembered remotely too.
        {
          const localSoundOn = profileRef.current.soundOn !== false;
          const remoteSoundOn = userRow.sound_on !== false;
          if (localSoundOn !== remoteSoundOn) {
            const next = { ...profileRef.current, soundOn: remoteSoundOn };
            setProfileState(next);
            put("meta", next);
          }
        }
        // Same idea for language and theme — both used to be local-only
        // and silently reset to their defaults after any sign-out.
        if (userRow.lang && profileRef.current.lang !== userRow.lang) {
          const next = { ...profileRef.current, lang: userRow.lang };
          setProfileState(next);
          put("meta", next);
        }
        if (userRow.theme && profileRef.current.theme !== userRow.theme) {
          const next = { ...profileRef.current, theme: userRow.theme };
          setProfileState(next);
          put("meta", next);
        }
        // Owned decorations/hair/outfits are new fields being synced for
        // the first time — a purchase made under the old, unsynced code
        // only exists on this device, so this unions rather than lets
        // remote's (likely empty) value simply overwrite it, and pushes
        // the union back up so the server finally learns about it too.
        {
          const union = (a, b) => Array.from(new Set([...(a || []), ...(b || [])]));
          const nextOwnedDecorations = union(profileRef.current.ownedDecorations, userRow.owned_decorations);
          const nextOwnedHair = union(profileRef.current.ownedHair, userRow.owned_hair);
          const nextOwnedOutfits = union(profileRef.current.ownedOutfits, userRow.owned_outfits);
          const grew = (list, remoteList) => list.length !== (remoteList || []).length;
          if (
            grew(nextOwnedDecorations, profileRef.current.ownedDecorations) ||
            grew(nextOwnedHair, profileRef.current.ownedHair) ||
            grew(nextOwnedOutfits, profileRef.current.ownedOutfits)
          ) {
            const next = {
              ...profileRef.current,
              ownedDecorations: nextOwnedDecorations,
              ownedHair: nextOwnedHair,
              ownedOutfits: nextOwnedOutfits,
            };
            setProfileState(next);
            put("meta", next);
          }
          if (userRef.current) {
            if (grew(nextOwnedDecorations, userRow.owned_decorations)) updateOwnedDecorations(user.id, nextOwnedDecorations);
            if (grew(nextOwnedHair, userRow.owned_hair)) updateOwnedHair(user.id, nextOwnedHair);
            if (grew(nextOwnedOutfits, userRow.owned_outfits)) updateOwnedOutfits(user.id, nextOwnedOutfits);
          }
        }
        // Equipping is an explicit, low-stakes choice (not something
        // earned that could be lost) — remote just wins, same as avatar.
        if ((profileRef.current.equippedDecoration || null) !== (userRow.equipped_decoration || null)) {
          const next = { ...profileRef.current, equippedDecoration: userRow.equipped_decoration || null };
          setProfileState(next);
          put("meta", next);
        }
        // Same idea for the avatar — it's edited from Me → customize on
        // whichever device you're on, so the remote copy is always the
        // most recent one across every device, and always wins here.
        const remoteAvatar = parseAvatar(userRow.avatar);
        if (remoteAvatar && JSON.stringify(remoteAvatar) !== JSON.stringify(profileRef.current.avatar || {})) {
          const next = { ...profileRef.current, avatar: remoteAvatar };
          setProfileState(next);
          put("meta", next);
        }
        // Coins only ever sync as a plain "here's my current total" push
        // (see updateCoins), so two devices earning/spending at the same
        // moment could in theory overwrite each other — an acceptable,
        // rare edge case for a cosmetic currency. Taking the higher of the
        // two on sign-in at least avoids the common case (offline earning
        // on one device) silently erasing progress.
        {
          const localCoins = profileRef.current.coins || 0;
          const remoteCoins = userRow.coins || 0;
          if (remoteCoins > localCoins) {
            const next = { ...profileRef.current, coins: remoteCoins };
            setProfileState(next);
            put("meta", next);
          } else if (localCoins > remoteCoins) {
            updateCoins(user.id, localCoins);
          }
        }
        // Same idea for class membership — joining (or, for an org account,
        // minting) a code writes it remotely first; without this, a cache
        // wipe on sign-out (see App.jsx) drops the local copy and there was
        // nothing here to bring it back, so a returning user looked like
        // they'd never joined at all.
        if ((profileRef.current.classCode || null) !== (userRow.class_code || null)) {
          if (profileRef.current.accountType === "org" && profileRef.current.classCode) {
            // An org account's own class_code can be missing here even
            // though their classes row and local profile both have it
            // (createClass used to only write the classes row) — local is
            // the known-good value in that case, so push it up instead of
            // pulling the gap back down.
            setMyClassCode(user.id, profileRef.current.classCode);
          } else {
            const next = { ...profileRef.current, classCode: userRow.class_code || null };
            setProfileState(next);
            put("meta", next);
          }
        }
        // A local profile that predates this sign-in (built while offline,
        // or from a device that used the app before creating an account)
        // never went through Onboarding's own push of display_name — that
        // only fires once, at the end of onboarding. Local `name` is the
        // only place it's ever edited, so it's always the source of truth
        // here; push it across whenever the two disagree.
        if (profileRef.current.name && userRow.display_name !== profileRef.current.name) {
          updateDisplayName(user.id, profileRef.current.name);
        }
        // Backfills userId on profiles that predate this field (created
        // before this fix shipped) — from this point on, this cache is
        // considered claimed by this account, so a future switch to a
        // genuinely different one is detected instead of silently inherited.
        if (!profileRef.current.userId) {
          const next = { ...profileRef.current, userId: user.id };
          setProfileState(next);
          put("meta", next);
        }
      }

      // `remote` was already fetched above (pullUserRow/pullMine ran
      // together to decide onboarded-vs-not) — reusing it here instead of
      // calling pullMine a second time for the same user's same data.
      const [allLocalInterests, allLocalEntries, allLocalPhotos] = await Promise.all([
        getAll("interests"), getAll("entries"), getAll("photos"),
      ]);
      // Trashed rows carry their own deletedAt now, synced like any other
      // field — pushing one syncs the tombstone instead of resurrecting the
      // row, and counting it here (rather than excluding it) is what stops
      // it from being adopted right back as if it were new.
      const remoteIntIds = new Set(remote.interests.map((i) => i.id));
      const toPush = allLocalInterests.filter((i) => !remoteIntIds.has(i.id));
      await Promise.all(toPush.map((rec) => pushInterest(rec, user.id)));

      const localIntIds = new Set(allLocalInterests.map((i) => i.id));
      const toAdopt = remote.interests.filter((i) => !localIntIds.has(i.id));
      await Promise.all(toAdopt.map((rec) => put("interests", rec)));

      const remoteEntryIds = new Set(remote.entries.map((e) => e.id));
      const entriesToPush = allLocalEntries.filter((e) => !remoteEntryIds.has(e.id));
      await Promise.all(entriesToPush.map((rec) => pushEntry(rec)));

      const localEntryIds = new Set(allLocalEntries.map((e) => e.id));
      const entriesToAdopt = remote.entries.filter((e) => !localEntryIds.has(e.id));
      await Promise.all(entriesToAdopt.map((rec) => put("entries", rec)));

      // A local-only photo might have its blob but never made it to Storage
      // (e.g. added offline) — upload it first so the row being pushed has
      // somewhere real to point storage_path at.
      const remotePhotoIds = new Set(remote.photos.map((p) => p.id));
      const photosToPush = allLocalPhotos.filter((p) => !remotePhotoIds.has(p.id));
      await Promise.all(photosToPush.map(async (rec) => {
        let storagePath = rec.storagePath;
        if (!storagePath && rec.blob) {
          storagePath = await uploadPhotoBlob(user.id, rec.id, rec.blob);
          if (storagePath) put("photos", { ...rec, storagePath });
        }
        await pushPhotoRow({ ...rec, storagePath });
      }));

      const localPhotoIds = new Set(allLocalPhotos.map((p) => p.id));
      const photosToAdopt = remote.photos.filter((p) => !localPhotoIds.has(p.id));
      await Promise.all(photosToAdopt.map((rec) => put("photos", rec)));

      // Every adopted row above already landed in Dexie, trashed or not —
      // same as any row loaded from local cache. Only non-trashed ones join
      // this live state, though: interests/entries/photos here are read
      // straight through by the rest of the app, and Recently Deleted is
      // the one place that goes to Dexie directly for the trashed ones
      // (see listTrash below).
      const live = (rows) => rows.filter((r) => !r.deletedAt);
      const adoptedInterests = live(toAdopt);
      const adoptedEntries = live(entriesToAdopt);
      const adoptedPhotos = live(photosToAdopt);
      if (adoptedInterests.length) {
        setInterests((list) => {
          const ids = new Set(list.map((i) => i.id));
          return [...list, ...adoptedInterests.filter((i) => !ids.has(i.id))].sort((a, b) => a.createdAt - b.createdAt);
        });
      }
      if (adoptedEntries.length) {
        setEntries((list) => {
          const ids = new Set(list.map((e) => e.id));
          return [...list, ...adoptedEntries.filter((e) => !ids.has(e.id))];
        });
      }
      if (adoptedPhotos.length) {
        setPhotos((list) => {
          const ids = new Set(list.map((p) => p.id));
          return [...list, ...adoptedPhotos.filter((p) => !ids.has(p.id))];
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
        if (userRef.current) updateCoins(userRef.current.id, next.coins);
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
      if (userRef.current) updateLang(userRef.current.id, lang);
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
      if (patch.avatar && userRef.current) updateAvatar(userRef.current.id, patch.avatar);
      if ("soundOn" in patch && userRef.current) updateSoundOn(userRef.current.id, patch.soundOn !== false);
      if (patch.theme && userRef.current) updateTheme(userRef.current.id, patch.theme);
    },
    // Unlike setDiscoverable/updateProfile, this waits on the remote write
    // before touching local state — a username collision (users_display_
    // name_unique_idx) has to be known *before* the local profile commits to
    // the new name, or the UI would show a name that didn't actually save.
    async changeUsername(name) {
      const trimmed = (name || "").trim();
      if (!trimmed) return { ok: false, reason: "empty" };
      if (!userRef.current) return { ok: false, reason: "error" };
      const result = await updateDisplayName(userRef.current.id, trimmed);
      if (!result.ok) return { ok: false, reason: result.taken ? "taken" : "error" };
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
      const exists = await classCodeExists(trimmed);
      if (!exists) return { ok: false, reason: "invalid" };
      if (userRef.current) {
        const pushed = await joinClassRemote(userRef.current.id, trimmed);
        if (!pushed) return { ok: false, reason: "error" };
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
      if (userRef.current) updateDiscovery(userRef.current.id, enabled);
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
    // revivedAt is a local-only game mechanic; coins does sync (see updateCoins).
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
            const trashed = { ...removedInterest, deletedAt: at };
            put("interests", trashed);
            if (userRef.current) pushInterest(trashed, userRef.current.id);
          }
          removedEntries.forEach((e) => {
            const trashed = { ...e, deletedAt: at };
            put("entries", trashed);
            if (userRef.current) pushEntry(trashed);
          });
          removedPhotos.forEach((p) => {
            const trashed = { ...p, deletedAt: at };
            put("photos", trashed);
            if (userRef.current) pushPhotoRow(trashed);
          });
        },
        restore() {
          if (!removedInterest) return;
          setInterests((list) => (list.some((x) => x.id === id) ? list : [...list, removedInterest].sort((a, b) => a.createdAt - b.createdAt)));
          setEntries((list) => [...list, ...removedEntries.filter((e) => !list.some((x) => x.id === e.id))]);
          setPhotos((list) => [...list, ...removedPhotos.filter((p) => !list.some((x) => x.id === p.id))]);
        },
      };
    },
    addPhoto(rec) {
      setPhotos((list) => [...list, rec]);
      put("photos", rec);
      bumpCoins(COINS_PER_LOG);
      // The row goes up right away (caption/visibility/etc. are cheap);
      // the actual bytes upload separately and the row gets storage_path
      // filled in once that finishes, so a slow upload never blocks the
      // rest of the photo's data from syncing.
      if (userRef.current) {
        pushPhotoRow(rec);
        uploadPhotoBlob(userRef.current.id, rec.id, rec.blob).then((storagePath) => {
          if (!storagePath) return;
          const next = { ...rec, storagePath };
          put("photos", next);
          setPhotos((list) => list.map((p) => (p.id === rec.id ? next : p)));
          pushPhotoRow(next);
        }).catch((err) => console.error("Sync (upload photo) threw:", err));
      }
    },
    // Exactly one cover per tree, so pinning a new one unpins whatever held
    // it before. Passing the same id again clears it, which falls the cover
    // back to the tree's first photo.
    setCoverPhoto(interestId, photoId) {
      setPhotos((list) => list.map((p) => {
        if (p.interestId !== interestId) return p;
        const next = { ...p, isPinned: p.id === photoId && !p.isPinned };
        if (next.isPinned !== p.isPinned) put("photos", next);
        return next;
      }));
    },
    updatePhotoCaption(id, caption) {
      setPhotos((list) => list.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, caption };
        put("photos", next);
        if (userRef.current) pushPhotoRow(next);
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
            const trashed = { ...removed, deletedAt: Date.now() };
            put("photos", trashed);
            if (userRef.current) pushPhotoRow(trashed);
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
      if (userRef.current) pushEntry(rec);
    },
    // Edits an existing entry in place — no coin bump, this isn't new
    // activity, just a correction to something already logged.
    updateEntry(rec) {
      setEntries((list) => list.map((x) => (x.id === rec.id ? rec : x)));
      put("entries", rec);
      if (userRef.current) pushEntry(rec);
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
            const trashed = { ...removed, deletedAt: Date.now() };
            put("entries", trashed);
            if (userRef.current) pushEntry(trashed);
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
      const cutoff = Date.now() - TRASH_DAYS * 86400000;
      const live = (rows, kind) => rows
        .filter((r) => r.deletedAt && r.deletedAt >= cutoff)
        .map((r) => ({ kind, rec: r, deletedAt: r.deletedAt }));
      // A deleted tree takes its entries and photos with it, and they come
      // back together too — listing each child separately would mean dozens
      // of rows for one delete and a way to half-restore a tree.
      const trashedTreeIds = new Set(ints.filter((i) => i.deletedAt).map((i) => i.id));
      return [
        ...live(ints, "interest"),
        ...live(ph.filter((p) => !trashedTreeIds.has(p.interestId)), "photo"),
        ...live(en.filter((e) => !trashedTreeIds.has(e.interestId)), "entry"),
      ].sort((a, b) => b.deletedAt - a.deletedAt);
    },
    async restoreTrashed(kind, id) {
      const strip = (r) => { const { deletedAt, ...rest } = r; return rest; };
      if (kind === "interest") {
        const [ints, ph, en] = await Promise.all([getAll("interests"), getAll("photos"), getAll("entries")]);
        const it = ints.find((x) => x.id === id);
        if (!it) return;
        const back = strip(it);
        put("interests", back);
        setInterests((list) => (list.some((x) => x.id === id) ? list : [...list, back].sort((a, b) => a.createdAt - b.createdAt)));
        // its children were trashed in the same breath, so they return too
        const kids = (rows) => rows.filter((r) => r.interestId === id && r.deletedAt).map(strip);
        const backPh = kids(ph), backEn = kids(en);
        backPh.forEach((r) => put("photos", r));
        backEn.forEach((r) => put("entries", r));
        setPhotos((list) => [...list, ...backPh.filter((r) => !list.some((x) => x.id === r.id))]);
        setEntries((list) => [...list, ...backEn.filter((r) => !list.some((x) => x.id === r.id))]);
        if (userRef.current) {
          pushInterest(back, userRef.current.id);
          backEn.forEach((r) => pushEntry(r));
          backPh.forEach((r) => pushPhotoRow(r));
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
        if (userRef.current) pushPhotoRow(back);
      } else {
        setEntries((l) => (l.some((x) => x.id === id) ? l : [...l, back]));
        if (userRef.current) pushEntry(back);
      }
    },
    // The one place anything is actually destroyed early, on request —
    // for real, locally and remotely, rather than waiting out the rest of
    // the TRASH_DAYS window for the sweep to do it.
    async purgeTrashed(kind, id) {
      if (kind === "interest") {
        const [ph, en] = await Promise.all([getAll("photos"), getAll("entries")]);
        ph.filter((p) => p.interestId === id).forEach((p) => del("photos", p.id));
        en.filter((e) => e.interestId === id).forEach((e) => del("entries", e.id));
        del("interests", id);
        // Cascades remotely too — entries/photos reference interests
        // on delete cascade, so this alone clears all three there.
        if (userRef.current) deleteRemoteInterest(id);
        return;
      }
      if (kind === "photo") {
        const rows = await getAll("photos");
        const rec = rows.find((r) => r.id === id);
        del("photos", id);
        if (userRef.current) deleteRemotePhoto(id, rec && rec.storagePath);
        return;
      }
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
      if (userRef.current) updateEquippedDecoration(userRef.current.id, next.equippedDecoration);
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
    clearGarden() {
      if (userRef.current) deleteAllMine(userRef.current.id);
      dbClearGarden();
      setInterests([]);
      setPhotos([]);
      setEntries([]);
    },
    // A manual "try again now" for the sync-status indicator — runs the
    // exact same retry the background timer would, just on demand.
    retrySync() {
      retryPendingRef.current();
    },
    };
  }, []);

  const value = useMemo(
    () => ({ loading, profile, interests, photos, entries, pendingSyncCount: pendingSyncIds.size, ...actions }),
    [loading, profile, interests, photos, entries, pendingSyncIds, actions]
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
