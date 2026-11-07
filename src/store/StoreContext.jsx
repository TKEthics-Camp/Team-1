import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getAll, get, put, del, clearAll as dbClearAll, clearGarden as dbClearGarden } from "../db/db";
import { COINS_PER_LOG, DECORATIONS, REVIVE_COST, PALETTE, DEFAULT_THEME, TRASH_DAYS, HAIR_STYLES, OUTFIT_STYLES } from "../lib/constants";
import { useAuth } from "./AuthContext";
import {
  pushInterest as remotePushInterest, deleteRemoteInterest, pushEntry as remotePushEntry, deleteRemoteEntry,
  deleteAllMine, pullMine, pullUserRow, updateDiscovery, updateDisplayName,
  joinClass as joinClassRemote, setMyClassCode, updateAvatar,
  parseAvatar, pushPhotoRow as remotePushPhotoRow, uploadPhotoBlob, updateCoins, deleteRemotePhoto,
  updateSoundOn, updateOwnedDecorations, updateEquippedDecoration, updateOwnedHair, updateOwnedOutfits,
  updateLang, updateTheme, uploadAudioBlob, syncLoginToUsername, removeVoiceNoteFile,
} from "../lib/remote";
import { earnedIds } from "../lib/badges";
import { loadPendingSync, savePendingSync, forgetPendingSync } from "../lib/pendingSync";
import { loadSeen, saveSeen, forgetSeen, splitLocalOnly } from "../lib/seenRemote";
import { newerSide, mergePulled } from "../lib/newestEdit";

const StoreCtx = createContext(null);

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

  // Sync status: a lightweight stand-in for a full offline queue. Every
  // push already re-sends the whole current record rather than a diff, so
  // "retry" just means "call the same push again later with whatever the
  // record looks like now" — no need to remember what specifically
  // changed, only which records still owe the server a successful push.
  //
  // What this adds over reconciliation is retrying failed *updates* to
  // something that already exists remotely: reconciliation only compares
  // IDs, so an edit to a record the server already has never goes up on its
  // own. The list is saved per account (see lib/pendingSync), so closing the
  // app before a retry lands no longer loses the edit — the next open loads
  // the list back and retries it once reconciliation has run.
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
  // pending list, written back a moment after it changes rather than once
  // per push, and forgotten at sign-out along with everything it describes.
  const seenRef = useRef({ userId: null, keys: new Set() });
  const seenSaveTimer = useRef(null);
  useEffect(() => {
    const prev = seenRef.current.userId;
    if (!user || user.isDebug) {
      if (prev) forgetSeen(prev);
      seenRef.current = { userId: null, keys: new Set() };
      return;
    }
    if (prev !== user.id) seenRef.current = { userId: user.id, keys: loadSeen(user.id) };
  }, [user]);
  function markSeen(store, id) {
    const seen = seenRef.current;
    if (!seen.userId) return;
    seen.keys.add(store + ":" + id);
    clearTimeout(seenSaveTimer.current);
    seenSaveTimer.current = setTimeout(() => saveSeen(seen.userId, seen.keys), 500);
  }

  // Every user edit is stamped at the moment it is made, not when it is
  // pushed: the server keeps whichever copy of a record carries the newest
  // stamp (20261017010000), and reconciliation pulls a newer copy down.
  function touched(rec) {
    return { ...rec, updatedAt: Math.max(Date.now(), (rec.updatedAt || 0) + 1) };
  }

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
    if (ok) markSeen("interests", rec.id);
    return ok;
  }
  // A row whose bytes haven't reached Storage still owes the server
  // something, even when the row itself landed: signing out wipes the only
  // copy of those bytes. Counting it as pending is what gets the upload
  // retried, and what makes logging out warn about it.
  async function pushEntry(rec) {
    const ok = await remotePushEntry(rec);
    markSyncResult("entries", rec.id, ok && !(rec.audio && !rec.audioPath));
    if (ok) markSeen("entries", rec.id);
    return ok;
  }
  async function pushPhotoRow(rec) {
    const ok = await remotePushPhotoRow(rec);
    markSyncResult("photos", rec.id, ok && !(rec.blob && !rec.storagePath));
    if (ok) markSeen("photos", rec.id);
    return ok;
  }

  // Upload the bytes, then push the row with the path filled in. Whatever
  // happened to the record during the upload wins over the copy this started
  // from: it may have been edited, trashed, or (no copy left) erased, and
  // writing the original back would undo that.
  async function uploadPhotoFile(rec, userId) {
    const storagePath = await uploadPhotoBlob(userId, rec.id, rec.blob);
    const cur = await get("photos", rec.id);
    if (!cur) return;
    if (!storagePath) { await pushPhotoRow(cur); return; }
    const next = { ...cur, storagePath };
    await put("photos", next);
    setPhotos((list) => list.map((p) => (p.id === rec.id ? { ...p, storagePath } : p)));
    await pushPhotoRow(next);
  }
  // Same for a voice note, which unlike a photo can also have been taken off
  // the entry while it was uploading.
  async function uploadEntryAudio(rec, userId) {
    const audioPath = await uploadAudioBlob(userId, rec.id, rec.audio);
    const cur = await get("entries", rec.id);
    if (!cur) return;
    if (!audioPath || !cur.audio) { await pushEntry(cur); return; }
    const next = { ...cur, audioPath };
    await put("entries", next);
    setEntries((list) => list.map((e) => (e.id === rec.id ? { ...e, audioPath } : e)));
    await pushEntry(next);
  }

  // A handful of profile settings (discoverable, sound, language, theme,
  // equipped decoration, avatar) are pushed the same fire-and-forget way
  // records are, but weren't tracked for retry — a save that failed here
  // had nothing to retry it, and reconciliation on the next sign-in treats
  // remote as the source of truth, so the setting would silently revert
  // with no error shown. Keyed "profile:<field>" instead of "<store>:<id>";
  // reads the CURRENT value from profileRef at push time, same principle
  // as interests/entries/photos using each record's current Dexie copy.
  const PROFILE_FIELD_PUSH = {
    discoverable: (v) => updateDiscovery(userRef.current.id, !!v),
    soundOn: (v) => updateSoundOn(userRef.current.id, v !== false),
    lang: (v) => updateLang(userRef.current.id, v || "en"),
    theme: (v) => updateTheme(userRef.current.id, v || DEFAULT_THEME),
    equippedDecoration: (v) => updateEquippedDecoration(userRef.current.id, v || null),
    avatar: (v) => updateAvatar(userRef.current.id, v || {}),
  };
  async function pushProfileField(field, value) {
    const ok = await PROFILE_FIELD_PUSH[field](value);
    markSyncResult("profile", field, ok);
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
        if (store === "profile") {
          const p = profileRef.current;
          if (!p) { markSyncResult(store, id, true); continue; }
          await pushProfileField(id, p[id]);
          continue;
        }
        const rec = byStore[store].find((r) => r.id === id);
        // Gone locally since (deleted for real, or already restored/
        // erased) — nothing left to retry, so stop tracking it.
        if (!rec) { markSyncResult(store, id, true); continue; }
        if (store === "interests") await pushInterest(rec, userRef.current.id);
        else if (store === "entries") {
          if (rec.audio && !rec.audioPath) await uploadEntryAudio(rec, userRef.current.id);
          else await pushEntry(rec);
        } else if (rec.blob && !rec.storagePath) await uploadPhotoFile(rec, userRef.current.id);
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
        en = sweep(en, "entries", (r) => deleteRemoteEntry(r.id, r.audioPath));

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
      // A signed-out cache wipe clears the local `profile` record too, which
      // is what App.jsx uses to decide Onboarding vs. the real app — without
      // this, a returning user would be sent through onboarding again every
      // time they log back in on a cleared cache. `users.display_name` is
      // only ever set once onboarding finishes, so a non-empty value there
      // means "this account already exists" and its profile can be rebuilt
      // straight from that row instead.
      const [userRow, remote] = await Promise.all([pullUserRow(user.id), pullMine(user.id)]);

      // Signed out while that was on its way: this device's copy has been
      // wiped, and nothing below may write the account back into it.
      if (reconciledForRef.current !== user.id) return;

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
      // finishing that overwrote their real settings and coins with the
      // defaults. So: stop, say so, and let App offer another try.
      if (!hasLocalProfile && !userRow) {
        reconciledForRef.current = null;
        setProfileCheck("failed");
        return;
      }

      // Several of the settings below can differ at once, and they all run
      // in one go with no render between them. profileRef only catches up on
      // a render, so each one has to move it along itself — building from a
      // stale ref kept only the last change, on screen and in Dexie both.
      const applyToProfile = (patch) => {
        const next = { ...profileRef.current, ...patch };
        profileRef.current = next;
        setProfileState(next);
        put("meta", next);
      };
      // A setting still waiting to be pushed is a newer choice than whatever
      // the server has. Pulling over it would lose the edit the pending list
      // exists to protect, then "retry" by pushing the old value back.
      const stillPending = (field) => pendingSyncRef.current.has("profile:" + field);

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
        //
        // The flag is written by a single unretried call at the end of
        // onboarding, so a planted tree still counts when it says false. A
        // class code doesn't here: signup can set one before onboarding runs.
        const onboarded = !userRow ? false
          : hasFlag ? (!!userRow.onboarding_completed || remote.interests.length > 0)
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
        if (!stillPending("discoverable") && !!profileRef.current.discoverable !== !!userRow.discovery_enabled) {
          applyToProfile({ discoverable: !!userRow.discovery_enabled });
        }
        // Same for sound — it used to be local-only and silently reset to
        // on after any sign-out; now it's remembered remotely too.
        {
          const localSoundOn = profileRef.current.soundOn !== false;
          const remoteSoundOn = userRow.sound_on !== false;
          if (!stillPending("soundOn") && localSoundOn !== remoteSoundOn) {
            applyToProfile({ soundOn: remoteSoundOn });
          }
        }
        // Same idea for language and theme — both used to be local-only
        // and silently reset to their defaults after any sign-out.
        if (!stillPending("lang") && userRow.lang && profileRef.current.lang !== userRow.lang) {
          applyToProfile({ lang: userRow.lang });
        }
        if (!stillPending("theme") && userRow.theme && profileRef.current.theme !== userRow.theme) {
          applyToProfile({ theme: userRow.theme });
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
            applyToProfile({
              ownedDecorations: nextOwnedDecorations,
              ownedHair: nextOwnedHair,
              ownedOutfits: nextOwnedOutfits,
            });
          }
          if (userRef.current) {
            if (grew(nextOwnedDecorations, userRow.owned_decorations)) updateOwnedDecorations(user.id, nextOwnedDecorations);
            if (grew(nextOwnedHair, userRow.owned_hair)) updateOwnedHair(user.id, nextOwnedHair);
            if (grew(nextOwnedOutfits, userRow.owned_outfits)) updateOwnedOutfits(user.id, nextOwnedOutfits);
          }
        }
        // Equipping is an explicit, low-stakes choice (not something
        // earned that could be lost) — remote just wins, same as avatar.
        if (!stillPending("equippedDecoration") && (profileRef.current.equippedDecoration || null) !== (userRow.equipped_decoration || null)) {
          applyToProfile({ equippedDecoration: userRow.equipped_decoration || null });
        }
        // Same idea for the avatar — it's edited from Me → customize on
        // whichever device you're on, so the remote copy is always the
        // most recent one across every device, and always wins here.
        const remoteAvatar = parseAvatar(userRow.avatar);
        if (!stillPending("avatar") && remoteAvatar && JSON.stringify(remoteAvatar) !== JSON.stringify(profileRef.current.avatar || {})) {
          applyToProfile({ avatar: remoteAvatar });
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
            applyToProfile({ coins: remoteCoins });
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
            setMyClassCode(profileRef.current.classCode);
          } else {
            applyToProfile({ classCode: userRow.class_code || null });
          }
        }
        // A local profile that predates this sign-in (built while offline,
        // or from a device that used the app before creating an account)
        // never went through Onboarding's own push of display_name — that
        // only fires once, at the end of onboarding — so an unclaimed one
        // (no userId yet, see below) pushes its name across.
        //
        // A claimed one can't have a name the server hasn't seen, because
        // changeUsername only commits locally after the server agreed. If
        // they disagree, it was renamed on another device, and pushing here
        // would quietly undo that rename from whichever phone opened next.
        if (profileRef.current.name && userRow.display_name !== profileRef.current.name) {
          if (!profileRef.current.userId) updateDisplayName(user.id, profileRef.current.name);
          else if (userRow.display_name) applyToProfile({ name: userRow.display_name });
        }
        // Backfills userId on profiles that predate this field (created
        // before this fix shipped) — from this point on, this cache is
        // considered claimed by this account, so a future switch to a
        // genuinely different one is detected instead of silently inherited.
        if (!profileRef.current.userId) {
          applyToProfile({ userId: user.id });
        }
      }
      setProfileCheck("done");

      // A student renamed before renames moved the login address can only
      // sign in with their old username. Signing in with it lands here, and
      // this moves the address to match the name they actually have — so
      // from then on the new name works, and so does a recovery code (which
      // looks people up by that name). Also moves a pre-fingerprint Chinese
      // name off the shared user@ address. Does nothing for an address that
      // already matches, or for an educator's real email.
      if (userRow && userRow.display_name) syncLoginToUsername(userRow.display_name);

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
      //
      // Of what this device has and the server doesn't, the records the
      // server had confirmed before were erased there since — Erase now, the
      // 30-day sweep or Clear all data on another device. Those go here too,
      // instead of being uploaded straight back (lib/seenRemote). The rest
      // were never uploaded, and go up now.
      const seen = seenRef.current.userId === user.id ? seenRef.current.keys : new Set();
      const split = {
        interests: splitLocalOnly("interests", allLocalInterests, remote.interests, seen, remote.complete),
        entries: splitLocalOnly("entries", allLocalEntries, remote.entries, seen, remote.complete),
        photos: splitLocalOnly("photos", allLocalPhotos, remote.photos, seen, remote.complete),
      };
      const erased = { interests: new Set(), entries: new Set(), photos: new Set() };
      for (const store of ["interests", "entries", "photos"]) {
        for (const rec of split[store].drop) {
          erased[store].add(rec.id);
          del(store, rec.id);
          markSyncResult(store, rec.id, true);
        }
      }
      if (erased.interests.size) setInterests((l) => l.filter((r) => !erased.interests.has(r.id)));
      if (erased.entries.size) setEntries((l) => l.filter((r) => !erased.entries.has(r.id)));
      if (erased.photos.size) setPhotos((l) => l.filter((r) => !erased.photos.has(r.id)));
      // Everything the server just handed back is, by definition, on it.
      remote.interests.forEach((r) => markSeen("interests", r.id));
      remote.entries.forEach((r) => markSeen("entries", r.id));
      remote.photos.forEach((r) => markSeen("photos", r.id));

      const toPush = split.interests.push;
      await Promise.all(toPush.map((rec) => pushInterest(rec, user.id)));

      const localIntIds = new Set(allLocalInterests.map((i) => i.id));
      const toAdopt = remote.interests.filter((i) => !localIntIds.has(i.id));
      await Promise.all(toAdopt.map((rec) => put("interests", rec)));

      // A local-only entry's voice note might have its blob but never made
      // it to Storage (e.g. recorded offline) — upload it first, same as
      // photosToPush does for photo blobs just above.
      const entriesToPush = split.entries.push;
      await Promise.all(entriesToPush.map((rec) => (
        !rec.audioPath && rec.audio ? uploadEntryAudio(rec, user.id) : pushEntry(rec)
      )));

      const localEntryIds = new Set(allLocalEntries.map((e) => e.id));
      const entriesToAdopt = remote.entries.filter((e) => !localEntryIds.has(e.id));
      await Promise.all(entriesToAdopt.map((rec) => put("entries", rec)));

      // A local-only photo might have its blob but never made it to Storage
      // (e.g. added offline) — upload it first so the row being pushed has
      // somewhere real to point storage_path at.
      const photosToPush = split.photos.push;
      await Promise.all(photosToPush.map((rec) => (
        !rec.storagePath && rec.blob ? uploadPhotoFile(rec, user.id) : pushPhotoRow(rec)
      )));

      const localPhotoIds = new Set(allLocalPhotos.map((p) => p.id));
      const photosToAdopt = remote.photos.filter((p) => !localPhotoIds.has(p.id));
      await Promise.all(photosToAdopt.map((rec) => put("photos", rec)));

      // Records both sides already have: the newer edit wins. Reconciling
      // used to compare IDs only, so a record on both sides was left alone
      // even when one copy was days newer (PRD §14.6). The server refuses a
      // stale push on its own (20261017010000); this is the other half —
      // pulling the newer copy down, and pushing a newer local one up.
      async function settle(store, localRows, remoteRows, push) {
        const remoteById = new Map(remoteRows.map((r) => [r.id, r]));
        const adopted = [];
        for (const local of localRows) {
          const remote = remoteById.get(local.id);
          if (!remote) continue;
          const side = newerSide(local, remote);
          if (side === "pull") {
            const merged = mergePulled(store, local, remote);
            await put(store, merged);
            adopted.push(merged);
          } else if (side === "push") {
            await push(local);
          }
        }
        return adopted;
      }
      const [newerInterests, newerEntries, newerPhotos] = await Promise.all([
        settle("interests", allLocalInterests, remote.interests, (r) => pushInterest(r, user.id)),
        settle("entries", allLocalEntries, remote.entries, pushEntry),
        settle("photos", allLocalPhotos, remote.photos, pushPhotoRow),
      ]);
      // Into what's on screen: replaced in place, dropped if the newer copy
      // is in the bin, brought back if it was restored on the other device.
      const applyNewer = (list, newer) => {
        if (!newer.length) return list;
        const byId = new Map(newer.map((r) => [r.id, r]));
        const kept = list
          .filter((r) => !(byId.has(r.id) && byId.get(r.id).deletedAt))
          .map((r) => (byId.has(r.id) ? byId.get(r.id) : r));
        const ids = new Set(kept.map((r) => r.id));
        return [...kept, ...newer.filter((r) => !r.deletedAt && !ids.has(r.id))];
      };
      if (newerInterests.length) setInterests((l) => applyNewer(l, newerInterests).sort((a, b) => a.createdAt - b.createdAt));
      if (newerEntries.length) setEntries((l) => applyNewer(l, newerEntries));
      if (newerPhotos.length) setPhotos((l) => applyNewer(l, newerPhotos));

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

      // Bytes that never made it up on a row the server already has. The
      // row's arrival made it look finished, so nothing ever went back for
      // the file — and the next sign-out destroyed the only copy. This also
      // rescues anything stranded that way before uploads were tracked.
      const [latestPhotos, latestEntries] = await Promise.all([getAll("photos"), getAll("entries")]);
      const pushing = new Set([...photosToPush, ...entriesToPush].map((r) => r.id));
      await Promise.all([
        ...latestPhotos.filter((p) => p.blob && !p.storagePath && !pushing.has(p.id)).map((p) => uploadPhotoFile(p, user.id)),
        ...latestEntries.filter((e) => e.audio && !e.audioPath && !pushing.has(e.id)).map((e) => uploadEntryAudio(e, user.id)),
      ]);

      // Edits that failed last time the app was open. Run after the
      // reconcile rather than waiting 45 seconds for the timer, so a student
      // who opens the app, glances and closes it again still gets them up.
      retryPendingRef.current();
    })();
  }, [user, loading, profileCheckTick]);

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
    pushProfileField,
    setLangOnProfile(lang) {
      setProfileState((p) => {
        if (!p) return p;
        const next = { ...p, lang };
        put("meta", next);
        return next;
      });
      if (userRef.current) pushProfileField("lang", lang);
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
      if (patch.avatar && userRef.current) pushProfileField("avatar", patch.avatar);
      if ("soundOn" in patch && userRef.current) pushProfileField("soundOn", patch.soundOn !== false);
      if (patch.theme && userRef.current) pushProfileField("theme", patch.theme);
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
      if (userRef.current) pushProfileField("discoverable", enabled);
    },
    addInterest(rec) {
      setInterests((list) => [...list, rec]);
      put("interests", rec);
      if (userRef.current) pushInterest(rec, userRef.current.id);
    },
    updateInterest(rec) {
      rec = touched(rec);
      setInterests((list) => list.map((x) => (x.id === rec.id ? rec : x)));
      put("interests", rec);
      if (userRef.current) pushInterest(rec, userRef.current.id);
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
            const trashed = { ...removedInterest, deletedAt: at, updatedAt: at };
            put("interests", trashed);
            if (userRef.current) pushInterest(trashed, userRef.current.id);
          }
          removedEntries.forEach((e) => {
            const trashed = { ...e, deletedAt: at, updatedAt: at };
            put("entries", trashed);
            if (userRef.current) pushEntry(trashed);
          });
          removedPhotos.forEach((p) => {
            const trashed = { ...p, deletedAt: at, updatedAt: at };
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
      // Exactly one cover per tree, the same rule as setCoverPhoto below.
      setPhotos((list) => [...(rec.isPinned ? list.map((p) => {
        if (p.interestId !== rec.interestId || !p.isPinned) return p;
        const next = touched({ ...p, isPinned: false });
        put("photos", next);
        if (userRef.current) pushPhotoRow(next);
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
        pushPhotoRow(rec)
          .then(() => uploadPhotoFile(rec, userId))
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
        if (userRef.current) pushPhotoRow(next);
        return next;
      }));
    },
    updatePhotoCaption(id, caption) {
      setPhotos((list) => list.map((p) => {
        if (p.id !== id) return p;
        const next = touched({ ...p, caption });
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
      // Same shape as addPhoto: the row goes up right away, and a voice
      // note's bytes upload separately, patching audio_path in once that
      // finishes so a slow upload never blocks the rest of the entry.
      if (userRef.current) {
        const userId = userRef.current.id;
        pushEntry(rec)
          .then(() => (rec.audio ? uploadEntryAudio(rec, userId) : null))
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
        pushEntry(rec)
          .then(() => (rec.audio && !rec.audioPath ? uploadEntryAudio(rec, userId) : null))
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
      // Stamped as a fresh edit: the trashed copy on the server carries the
      // time it was deleted, and an older stamp would be refused there
      // (keep_newest_edit, 20261017010000) — the restore would never land.
      const strip = (r) => { const { deletedAt, ...rest } = r; return touched(rest); };
      if (kind === "interest") {
        const [ints, ph, en] = await Promise.all([getAll("interests"), getAll("photos"), getAll("entries")]);
        const it = ints.find((x) => x.id === id);
        if (!it) return;
        const back = strip(it);
        put("interests", back);
        setInterests((list) => (list.some((x) => x.id === id) ? list : [...list, back].sort((a, b) => a.createdAt - b.createdAt)));
        // its children were trashed in the same breath, so they return too.
        // Only those: deleteInterest stamps them all with one time, and an
        // entry deleted on its own last week stays deleted (it shows in
        // Recently Deleted again now that its tree is back).
        const kids = (rows) => rows.filter((r) => r.interestId === id && r.deletedAt === it.deletedAt).map(strip);
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
      if (userRef.current) pushProfileField("equippedDecoration", next.equippedDecoration);
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
      retryPendingRef.current();
    },
    // Another go at the sign-in check, when it couldn't reach the server.
    retryProfileCheck() {
      setProfileCheck("checking");
      setProfileCheckTick((n) => n + 1);
    },
    };
  }, []);

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
