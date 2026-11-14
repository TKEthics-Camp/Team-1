// The decisions sign-in sync makes, kept apart from the store so each one
// can be tested on its own. Nothing here touches Dexie, Supabase or React:
// every function takes what was read and returns what should change, and
// StoreContext's reconcile effect does the writing.
import { PALETTE, DEFAULT_THEME } from "./constants";
import { earnedIds } from "./badges";
import { parseAvatar } from "./parseAvatar";

const live = (rows) => rows.filter((r) => !r.deletedAt);

// Whether an account with no profile on this device has already been
// through onboarding, judged from its server row and records.
//
// onboarding_completed, not display_name — AuthFlow sets display_name at
// signup already (to reserve the username before onboarding even starts).
// The column is only present once its migration has been applied, though,
// and a project without it read `undefined` — falsy — so every returning
// user looked un-onboarded. Without the column, fall back to what only
// exists once onboarding has run: a planted tree, or an educator's class
// code. With it, a planted tree still counts when it says false (the flag
// is written by one unretried call at the end of onboarding); a class code
// doesn't, since signup can set one before onboarding runs.
export function isOnboarded(userRow, remote) {
  if (!userRow) return false;
  const hasTrees = remote.interests.length > 0;
  const hasFlag = Object.prototype.hasOwnProperty.call(userRow, "onboarding_completed");
  return hasFlag ? (!!userRow.onboarding_completed || hasTrees) : (hasTrees || !!userRow.class_code);
}

// A returning account's profile, rebuilt from its server row after a
// sign-out wiped this device. earnedBadges is seeded from what was just
// pulled, or useBadgeWatcher would see an empty garden first and then
// re-announce every badge once the records arrive. Trashed rows don't count,
// the same as in the live badge count they'll be compared against.
export function rebuildProfile(userRow, remote, userId) {
  return {
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
    userId,
  };
}

const union = (a, b) => Array.from(new Set([...(a || []), ...(b || [])]));
const longerThan = (list, other) => list.length !== (other || []).length;

// What a profile already on this device should take from the account's
// server row, and what the server should take from it.
//
// `isPending(field)` says a setting is still waiting to be pushed: that is a
// newer choice than whatever the server holds, so it is never pulled over.
//
// Returns { patch, push }: `patch` is merged into the local profile (empty
// when nothing changes), and `push` lists what to send up, each key present
// only when that value needs sending.
/**
 * @param {any} local
 * @param {any} userRow
 * @param {string} userId
 * @param {(field: string) => boolean} [isPending]
 */
export function profileFromServer(local, userRow, userId, isPending = (_field) => false) {
  const patch = {};
  const push = {};

  // Settings that are a plain choice: the server's copy is the newest one
  // across devices, so it wins unless this device has one still on its way.
  if (!isPending("discoverable") && !!local.discoverable !== !!userRow.discovery_enabled) {
    patch.discoverable = !!userRow.discovery_enabled;
  }
  const remoteSoundOn = userRow.sound_on !== false;
  if (!isPending("soundOn") && (local.soundOn !== false) !== remoteSoundOn) {
    patch.soundOn = remoteSoundOn;
  }
  if (!isPending("lang") && userRow.lang && local.lang !== userRow.lang) patch.lang = userRow.lang;
  if (!isPending("theme") && userRow.theme && local.theme !== userRow.theme) patch.theme = userRow.theme;
  if (!isPending("equippedDecoration") && (local.equippedDecoration || null) !== (userRow.equipped_decoration || null)) {
    patch.equippedDecoration = userRow.equipped_decoration || null;
  }
  const remoteAvatar = parseAvatar(userRow.avatar);
  if (!isPending("avatar") && remoteAvatar && JSON.stringify(remoteAvatar) !== JSON.stringify(local.avatar || {})) {
    patch.avatar = remoteAvatar;
  }

  // Things bought are never lost: a purchase made before these were synced
  // only exists on this device, so the two sides are unioned, and whichever
  // side was missing something learns it.
  const owned = {
    ownedDecorations: union(local.ownedDecorations, userRow.owned_decorations),
    ownedHair: union(local.ownedHair, userRow.owned_hair),
    ownedOutfits: union(local.ownedOutfits, userRow.owned_outfits),
  };
  const remoteOwned = {
    ownedDecorations: userRow.owned_decorations,
    ownedHair: userRow.owned_hair,
    ownedOutfits: userRow.owned_outfits,
  };
  if (Object.keys(owned).some((k) => longerThan(owned[k], local[k]))) Object.assign(patch, owned);
  for (const k of Object.keys(owned)) {
    if (longerThan(owned[k], remoteOwned[k])) push[k] = owned[k];
  }

  // Coins sync as a plain total, so two devices could overwrite each other.
  // Taking the higher one at least keeps offline earning from being erased.
  const localCoins = local.coins || 0;
  const remoteCoins = userRow.coins || 0;
  if (remoteCoins > localCoins) patch.coins = remoteCoins;
  else if (localCoins > remoteCoins) push.coins = localCoins;

  // Class membership is written to the server first, so the server's copy
  // is right — except an educator's own code, which older versions only
  // wrote to the classes row. There the local copy is the good one.
  if ((local.classCode || null) !== (userRow.class_code || null)) {
    if (local.accountType === "org" && local.classCode) push.classCode = local.classCode;
    else patch.classCode = userRow.class_code || null;
  }

  // A profile not yet claimed by an account (built before signing in) never
  // pushed its name, so it does now. A claimed one can't hold a name the
  // server hasn't seen — renames commit locally only after the server agrees
  // — so a difference means it was renamed on another device.
  if (local.name && userRow.display_name !== local.name) {
    if (!local.userId) push.displayName = local.name;
    else if (userRow.display_name) patch.name = userRow.display_name;
  }
  // From here on this cache belongs to this account, so a later sign-in by
  // a different one is caught instead of inheriting it.
  if (!local.userId) patch.userId = userId;

  return { patch, push };
}

export const byCreated = (a, b) => a.createdAt - b.createdAt;

// Newer copies pulled from the server, into the list on screen: replaced in
// place, dropped if the newer copy is in the bin, added if it was restored
// on another device.
export function applyNewer(list, newer) {
  if (!newer.length) return list;
  const byId = new Map(newer.map((r) => [r.id, r]));
  const kept = list
    .filter((r) => !(byId.has(r.id) && byId.get(r.id).deletedAt))
    .map((r) => (byId.has(r.id) ? byId.get(r.id) : r));
  const ids = new Set(kept.map((r) => r.id));
  return [...kept, ...newer.filter((r) => !r.deletedAt && !ids.has(r.id))];
}

// Rows adopted from the server, into the list on screen. Trashed ones stay
// in Dexie only (Recently Deleted reads them from there), and a row already
// on screen is never added twice.
export function addAdopted(list, adopted) {
  const fresh = live(adopted);
  if (!fresh.length) return list;
  const ids = new Set(list.map((r) => r.id));
  return [...list, ...fresh.filter((r) => !ids.has(r.id))];
}

// Records both sides have, sorted by which way the newer edit has to go.
export function settlePlan(localRows, remoteRows, newerSide) {
  const remoteById = new Map(remoteRows.map((r) => [r.id, r]));
  const pull = [], push = [];
  for (const local of localRows) {
    const remote = remoteById.get(local.id);
    if (!remote) continue;
    const side = newerSide(local, remote);
    if (side === "pull") pull.push({ local, remote });
    else if (side === "push") push.push(local);
  }
  return { pull, push };
}
