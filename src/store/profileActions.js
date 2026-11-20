// Actions on the signed-in student's profile: settings, name, class,
// and what they've bought. Each one updates the screen and this device's
// copy at once, then tells the server (see syncEngine for retries).
import { put } from "../db/db";
import { DECORATIONS, HAIR_STYLES, OUTFIT_STYLES } from "../lib/constants";
import {
  updateDisplayName, joinClass as joinClassRemote, updateCoins,
  updateOwnedDecorations, updateOwnedHair, updateOwnedOutfits, syncLoginToUsername,
} from "../lib/remote";

/** @param {import("./storeContextTypes").StoreCtx} ctx */
export function createProfileActions(ctx) {
  const { setProfileState, profileRef, userRef, sync } = ctx;

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
  };
}
