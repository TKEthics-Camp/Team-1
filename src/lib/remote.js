import { supabase } from "./supabase";
import { randomClassCode } from "./id";

// users.avatar is '' until the first sync, and JSON.parse('') throws —
// null here means "nothing remote yet" (render the default look), not
// "reset to defaults" as a stored value.
export function parseAvatar(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// DEBUG ONLY: mirrors the flag in AuthContext.jsx. When set, searchUsers and
// pullPublicProfile serve one fixture "friend" instead of hitting Supabase,
// so the search -> view-another-user's-orb flow can be tested without a
// second real account. Never set outside local dev.
const DEBUG_MOCK = import.meta.env.DEV && import.meta.env.VITE_DEBUG_SKIP_AUTH === "true";
const DEBUG_FRIEND_ID = "00000000-0000-0000-0000-000000000099";
const DEBUG_FRIEND = { id: DEBUG_FRIEND_ID, display_name: "Debug Friend", account_type: "individual" };
const DEBUG_INTEREST_ROW = {
  id: "debug-interest-pottery",
  user_id: DEBUG_FRIEND_ID,
  name: "Pottery",
  why: "It calms me down after school",
  color: "#63C489",
  created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
};
const DEBUG_ENTRY_ROWS = [
  {
    id: "debug-entry-1", interest_id: DEBUG_INTEREST_ROW.id, date: "2026-07-20",
    text: "Made my first bowl today! It's lopsided but I love it.", minutes: 45,
    visibility: "public", is_pinned: false,
    created_at: "2026-07-20T12:00:00.000Z", updated_at: "2026-07-20T12:00:00.000Z",
  },
  {
    id: "debug-entry-2", interest_id: DEBUG_INTEREST_ROW.id, date: "2026-07-22",
    text: "Glazed it a deep blue. Picking it up from the kiln next week.", minutes: 30,
    visibility: "public", is_pinned: false,
    created_at: "2026-07-22T12:00:00.000Z", updated_at: "2026-07-22T12:00:00.000Z",
  },
];

// Maps between the local (Dexie/StoreContext) shape and the Supabase row
// shape for interests + entries. Photos are deliberately left out for now —
// they still store a local Blob, and syncing them needs a Storage bucket
// and an upload/download path, which is a separate follow-up.

function toIso(ms) {
  return new Date(ms || Date.now()).toISOString();
}
function toMs(iso) {
  return new Date(iso).getTime();
}

// The columns added by 20260725000000_interest_appearance_columns.sql —
// without them, adopting a tree on a second device silently lost its
// reminder weekdays, chosen species/leaf colour, and revival time.
// pushInterest retries without them if the migration isn't applied yet.
function appearanceColumns(rec) {
  return {
    days: rec.days || [],
    species: rec.species || null,
    leaf_color: rec.leafColor || null,
    revived_at: rec.revivedAt ? toIso(rec.revivedAt) : null,
  };
}

export function interestToRow(rec, userId) {
  return {
    id: rec.id,
    user_id: userId,
    name: rec.name,
    why: rec.why || "",
    color: rec.color || "",
    created_at: toIso(rec.createdAt),
    updated_at: toIso(rec.updatedAt || rec.createdAt),
    ...appearanceColumns(rec),
    deleted_at: rec.deletedAt ? toIso(rec.deletedAt) : null,
  };
}

export function rowToInterest(row) {
  return {
    id: row.id,
    name: row.name,
    why: row.why,
    color: row.color,
    days: row.days || [],
    species: row.species || null,
    leafColor: row.leaf_color || null,
    revivedAt: row.revived_at ? toMs(row.revived_at) : undefined,
    deletedAt: row.deleted_at ? toMs(row.deleted_at) : undefined,
    createdAt: toMs(row.created_at),
    updatedAt: toMs(row.updated_at),
  };
}

export function entryToRow(rec) {
  return {
    id: rec.id,
    interest_id: rec.interestId,
    date: rec.date,
    text: rec.text || "",
    minutes: rec.minutes ?? 30,
    visibility: rec.visibility || "private",
    is_pinned: !!rec.isPinned,
    created_at: toIso(rec.createdAt),
    updated_at: toIso(rec.updatedAt || rec.createdAt),
    shared_to_feed: !!rec.sharedToFeed,
    deleted_at: rec.deletedAt ? toIso(rec.deletedAt) : null,
    audio_path: rec.audioPath || null,
    audio_ms: rec.audioMs || null,
  };
}

export function rowToEntry(row) {
  return {
    id: row.id,
    interestId: row.interest_id,
    date: row.date,
    text: row.text,
    minutes: row.minutes,
    visibility: row.visibility,
    isPinned: row.is_pinned,
    sharedToFeed: !!row.shared_to_feed,
    deletedAt: row.deleted_at ? toMs(row.deleted_at) : undefined,
    audioPath: row.audio_path || null,
    audioMs: row.audio_ms || undefined,
    createdAt: toMs(row.created_at),
    updatedAt: toMs(row.updated_at),
  };
}

export function photoToRow(rec) {
  return {
    id: rec.id,
    interest_id: rec.interestId,
    storage_path: rec.storagePath || null,
    caption: rec.caption || "",
    visibility: rec.visibility || "private",
    is_pinned: !!rec.isPinned,
    created_at: toIso(rec.createdAt),
    deleted_at: rec.deletedAt ? toIso(rec.deletedAt) : null,
  };
}

// No `blob` here — a photo pulled from Supabase only ever carries a
// storage_path at first. The actual bytes are fetched lazily (see
// lib/image.js's usePhotoURL) the moment something actually tries to
// display it, not eagerly for every photo on every sign-in.
export function rowToPhoto(row) {
  return {
    id: row.id,
    interestId: row.interest_id,
    storagePath: row.storage_path,
    caption: row.caption,
    visibility: row.visibility,
    isPinned: row.is_pinned,
    deletedAt: row.deleted_at ? toMs(row.deleted_at) : undefined,
    createdAt: toMs(row.created_at),
  };
}

// Every push is fire-and-forget from the caller's perspective (writes
// already landed locally first — local-first means the UI never waits on
// the network) — but each one does report back whether it actually landed
// (true/false), so StoreContext's tracked wrappers know when to mark a
// record as still needing a retry. Failures are always logged either way.

// Columns each table only has once its own migration has been applied —
// not necessarily in the order those migrations were written, since
// nothing forces them to actually be run in order (a project can easily
// have a newer one applied but not an older one).
const INTEREST_OPTIONAL_COLUMNS = ["deleted_at", "days", "species", "leaf_color", "revived_at"];
const ENTRY_OPTIONAL_COLUMNS = ["deleted_at", "shared_to_feed", "audio_path", "audio_ms"];
const PHOTO_OPTIONAL_COLUMNS = ["deleted_at"];

// PGRST204 means PostgREST doesn't recognize one of the columns in the
// payload, and names exactly which one in its message — so this drops
// only that column and retries, then asks again, instead of guessing a
// fixed order to fall back through. A project missing an older migration
// but not a newer one (columns don't always land in the order they were
// written) would otherwise lose whatever the guessed order got wrong,
// silently, on every single save.
async function upsertWithFallback(table, row, optionalColumns) {
  let candidate = row;
  for (;;) {
    const { error } = await supabase.from(table).upsert(candidate);
    if (!error) return true;
    const missing = error.code === "PGRST204" && error.message && error.message.match(/'([^']+)' column/);
    const col = missing && missing[1];
    if (!col || !(col in candidate) || !optionalColumns.includes(col)) {
      console.error(`Sync (${table}) failed:`, error);
      return false;
    }
    const next = { ...candidate };
    delete next[col];
    candidate = next;
  }
}

export async function pushInterest(rec, userId) {
  return upsertWithFallback("interests", interestToRow(rec, userId), INTEREST_OPTIONAL_COLUMNS);
}

export async function deleteRemoteInterest(id) {
  const { error } = await supabase.from("interests").delete().eq("id", id);
  if (error) console.error("Sync (delete interest) failed:", error);
}

export async function pushEntry(rec) {
  const row = entryToRow(rec);
  return upsertWithFallback("entries", row, ENTRY_OPTIONAL_COLUMNS);
}

export async function deleteRemoteEntry(id, audioPath) {
  if (audioPath) {
    const { error: rmErr } = await supabase.storage.from("voice-notes").remove([audioPath]);
    if (rmErr) console.error("Sync (delete voice note file) failed:", rmErr);
  }
  const { error } = await supabase.from("entries").delete().eq("id", id);
  if (error) console.error("Sync (delete entry) failed:", error);
}

export async function pushPhotoRow(rec) {
  const row = photoToRow(rec);
  return upsertWithFallback("photos", row, PHOTO_OPTIONAL_COLUMNS);
}

export async function deleteRemotePhoto(id, storagePath) {
  if (storagePath) {
    const { error: rmErr } = await supabase.storage.from("photos").remove([storagePath]);
    if (rmErr) console.error("Sync (delete photo file) failed:", rmErr);
  }
  const { error } = await supabase.from("photos").delete().eq("id", id);
  if (error) console.error("Sync (delete photo) failed:", error);
}

// Uploads the already-downscaled blob (see lib/image.js's downscale, used
// by PhotoSheet.jsx before this is ever called) and returns the storage
// path to save on the photo's row, or null on failure — the local blob
// stays the source of truth on this device either way.
export async function uploadPhotoBlob(userId, photoId, blob) {
  const path = `${userId}/${photoId}.jpg`;
  try {
    const { error } = await supabase.storage.from("photos").upload(path, blob, {
      upsert: true,
      contentType: blob.type || "image/jpeg",
    });
    if (error) {
      console.error("Sync (upload photo) failed:", error);
      return null;
    }
    return path;
  } catch (err) {
    // A network/CORS-level failure throws instead of returning `error`,
    // which would otherwise skip the logging above entirely.
    console.error("Sync (upload photo) threw:", err);
    return null;
  }
}

// Fetches a photo's actual bytes — for anything that isn't already a local
// blob: someone else's photo, or your own on a device that hasn't
// downloaded it yet. RLS on storage.objects (see the photo_storage
// migration) enforces the same visibility rule as the photos table itself,
// so this naturally returns nothing for a photo this viewer can't see.
export async function downloadPhotoBlob(storagePath) {
  if (!storagePath) return null;
  try {
    const { data, error } = await supabase.storage.from("photos").download(storagePath);
    if (error) {
      console.error("Sync (download photo) failed:", error);
      return null;
    }
    return data;
  } catch (err) {
    console.error("Sync (download photo) threw:", err);
    return null;
  }
}

// Voice notes only ever had a local Blob — no bucket, no column — so a
// sign-out (which wipes local storage) or a second device lost them for
// good. Mirrors uploadPhotoBlob/downloadPhotoBlob exactly, just a
// different bucket and no fixed extension (a recording's real container —
// webm, mp4, ogg — depends on what the browser supports; see useRecorder's
// pickMime), the audio element on playback reads that from the blob's own
// stored type, not the path.
export async function uploadAudioBlob(userId, entryId, blob) {
  const path = `${userId}/${entryId}`;
  try {
    const { error } = await supabase.storage.from("voice-notes").upload(path, blob, {
      upsert: true,
      contentType: blob.type || "audio/webm",
    });
    if (error) {
      console.error("Sync (upload voice note) failed:", error);
      return null;
    }
    return path;
  } catch (err) {
    console.error("Sync (upload voice note) threw:", err);
    return null;
  }
}

export async function downloadAudioBlob(storagePath) {
  if (!storagePath) return null;
  try {
    const { data, error } = await supabase.storage.from("voice-notes").download(storagePath);
    if (error) {
      console.error("Sync (download voice note) failed:", error);
      return null;
    }
    return data;
  } catch (err) {
    console.error("Sync (download voice note) threw:", err);
    return null;
  }
}

export async function deleteAllMine(userId) {
  // Cascades to that user's entries and photos via the FK ON DELETE CASCADE
  // in the migration, so one delete is enough to erase everything remote.
  const { error } = await supabase.from("interests").delete().eq("user_id", userId);
  if (error) console.error("Sync (delete all) failed:", error);
}

export async function pullUserRow(userId) {
  const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();
  if (error) {
    console.error("Sync (pull user) failed:", error);
    return null;
  }
  return data;
}

// These six (discovery, sound, language, theme, equipped decoration,
// avatar) are the settings StoreContext tracks for retry (see
// pushProfileField) — unlike the other users-table updaters, a failed
// save here would otherwise get silently overwritten by the stale remote
// value on the next sign-in, with nothing telling the user it reverted.
// Reporting true/false (and catching a thrown network/CORS-level failure,
// same as uploadPhotoBlob) is what makes that retry possible.
export async function updateDiscovery(userId, enabled) {
  try {
    const { error } = await supabase.from("users").update({ discovery_enabled: enabled }).eq("id", userId);
    if (error) { console.error("Sync (discovery) failed:", error); return false; }
    return true;
  } catch (err) {
    console.error("Sync (discovery) threw:", err);
    return false;
  }
}

// Without this, soundOn only ever lived in local storage — a sign-out
// wipes that, and the profile rebuilt on the next sign-in had nowhere to
// recover it from, so it silently came back on regardless of what was
// chosen before.
export async function updateSoundOn(userId, soundOn) {
  try {
    const { error } = await supabase.from("users").update({ sound_on: soundOn }).eq("id", userId);
    if (error) { console.error("Sync (sound) failed:", error); return false; }
    return true;
  } catch (err) {
    console.error("Sync (sound) threw:", err);
    return false;
  }
}

// Both used to be local-only and silently reset to their defaults after
// any sign-out (English, and whatever DEFAULT_THEME is) regardless of
// what was chosen before.
export async function updateLang(userId, lang) {
  try {
    const { error } = await supabase.from("users").update({ lang }).eq("id", userId);
    if (error) { console.error("Sync (lang) failed:", error); return false; }
    return true;
  } catch (err) {
    console.error("Sync (lang) threw:", err);
    return false;
  }
}

export async function updateTheme(userId, theme) {
  try {
    const { error } = await supabase.from("users").update({ theme }).eq("id", userId);
    if (error) { console.error("Sync (theme) failed:", error); return false; }
    return true;
  } catch (err) {
    console.error("Sync (theme) threw:", err);
    return false;
  }
}

// The real signal StoreContext's reconciliation uses to tell "finished
// onboarding" apart from "just signed up" — display_name alone stopped
// working for this once AuthFlow started setting it at signup, before
// onboarding runs, to reserve the username early.
export async function markOnboardingComplete(userId) {
  const { error } = await supabase.from("users").update({ onboarding_completed: true }).eq("id", userId);
  if (error) console.error("Sync (onboarding complete) failed:", error);
}

export async function updateCoins(userId, coins) {
  const { error } = await supabase.from("users").update({ coins }).eq("id", userId);
  if (error) console.error("Sync (coins) failed:", error);
}

// Coins spent on a decoration/hair/outfit style already sync (see
// updateCoins) — without these, what was actually bought didn't, so
// signing out spent the coins for good but lost the purchase.
export async function updateOwnedDecorations(userId, ownedDecorations) {
  const { error } = await supabase.from("users").update({ owned_decorations: ownedDecorations }).eq("id", userId);
  if (error) console.error("Sync (owned decorations) failed:", error);
}

export async function updateEquippedDecoration(userId, equippedDecoration) {
  try {
    const { error } = await supabase.from("users").update({ equipped_decoration: equippedDecoration }).eq("id", userId);
    if (error) { console.error("Sync (equipped decoration) failed:", error); return false; }
    return true;
  } catch (err) {
    console.error("Sync (equipped decoration) threw:", err);
    return false;
  }
}

export async function updateOwnedHair(userId, ownedHair) {
  const { error } = await supabase.from("users").update({ owned_hair: ownedHair }).eq("id", userId);
  if (error) console.error("Sync (owned hair) failed:", error);
}

export async function updateOwnedOutfits(userId, ownedOutfits) {
  const { error } = await supabase.from("users").update({ owned_outfits: ownedOutfits }).eq("id", userId);
  if (error) console.error("Sync (owned outfits) failed:", error);
}

// users.avatar is text, not jsonb — the avatar customization (skin, hair,
// hair colour, outfit, outfit colour) is stored as a JSON string so a
// device other than the one that made the edit can pick it up too.
export async function updateAvatar(userId, avatar) {
  try {
    const { error } = await supabase.from("users").update({ avatar: JSON.stringify(avatar) }).eq("id", userId);
    if (error) { console.error("Sync (avatar) failed:", error); return false; }
    return true;
  } catch (err) {
    console.error("Sync (avatar) threw:", err);
    return false;
  }
}

export async function updateDisplayName(userId, name) {
  const { error } = await supabase.from("users").update({ display_name: name }).eq("id", userId);
  if (error) {
    console.error("Sync (display name) failed:", error);
    // 23505 = unique_violation — the users_display_name_unique_idx guard.
    return { ok: false, taken: error.code === "23505" };
  }
  return { ok: true };
}

// The classes row is what makes a code exist and lets a student validate
// it pre-join; the educator's own users.class_code is what actually lets
// users_select's classmate branch resolve for their account (it checks
// "does this row's class_code match *my own* class_code"), so an educator
// who never gets this set can never see their own students no matter who
// joins. Both have to be written for a code to actually work end to end.
// Goes through join_class() like everyone else: users.class_code is frozen
// against direct writes (see 20260912000000), and by the time this is
// called createClass has already inserted the row, so the code validates.
export async function setMyClassCode(code) {
  const { error } = await supabase.rpc("join_class", { p_code: code });
  if (error) console.error("Sync (set own class_code) failed:", error);
}

// Mints this educator's one class code. Called once, at the end of org
// onboarding — the caller retries with a fresh code on { taken: true }.
export async function createClass(userId, code) {
  const { error } = await supabase.from("classes").insert({ code, owner_id: userId });
  if (error) {
    // 23505 = unique_violation, but from either constraint: the code
    // itself (classes_pkey) or this account (classes_owner_id_key). Only
    // a code collision is worth retrying with a fresh code — an owner_id
    // collision means this account already minted one, and the caller
    // should look that up instead of generating yet another code for it.
    if (error.code === "23505") {
      const ownerCollision = /owner_id/i.test(error.message || "") || /owner_id/i.test(error.details || "");
      return { ok: false, taken: !ownerCollision, alreadyMinted: ownerCollision };
    }
    console.error("Sync (create class) failed:", error);
    return { ok: false, taken: false, alreadyMinted: false };
  }
  await setMyClassCode(code);
  return { ok: true };
}

// This account's own class code, if it's already minted one — used when
// createClass reports alreadyMinted instead of generating a code that
// would just collide again.
export async function fetchMyClassCode(userId) {
  const { data, error } = await supabase.from("classes").select("code").eq("owner_id", userId).maybeSingle();
  if (error) {
    console.error("Sync (fetch my class code) failed:", error);
    return null;
  }
  return data ? data.code : null;
}

// This account's class code, minting one if it doesn't have one yet.
// Called at the end of org onboarding, and again from EducatorDashboard
// as a self-heal for any account whose original mint attempt failed
// silently (network hiccup, an interrupted signup) and is stuck without
// one — same underlying calls either way, just retried from wherever the
// account actually is.
export async function mintOrFetchClassCode(userId) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomClassCode();
    const result = await createClass(userId, code);
    if (result.ok) return code;
    if (result.alreadyMinted) {
      const existing = await fetchMyClassCode(userId);
      if (existing) await setMyClassCode(existing);
      return existing;
    }
    if (!result.taken) break;
  }
  return null;
}

// Joins a class by code. The check for "is this a real code" lives inside
// join_class() on the server now — the classes table isn't readable by
// anyone but its owner, precisely so codes can't be listed and walked into,
// which is what a client-side existence check allowed. A wrong code comes
// back as a plain false, not an error: it's an ordinary thing to type.
export async function joinClass(code) {
  const { data, error } = await supabase.rpc("join_class", { p_code: code });
  if (error) {
    console.error("Sync (join class) failed:", error);
    return "error";
  }
  return data ? "joined" : "invalid";
}

// Erases the account for good: storage objects first, then the auth row,
// which cascades every table that hangs off it. Server-side in one call
// (see 20260912010000) because a client can't delete its own auth.users
// row at all, and a half-finished deletion is worse than none.
export async function deleteMyAccount() {
  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    console.error("Account deletion failed:", error);
    return false;
  }
  return true;
}

// Everyone else sharing this class_code — RLS's users_select class-code
// branch already restricts what comes back to real classmates (and
// nothing blocked either direction), so there's nothing left to filter
// client-side except the educator themselves: their own account shares
// this class_code too (see setMyClassCode), but the educator isn't a
// classmate to anyone.
export async function fetchClassmates(userId, classCode) {
  // An org account's own code is minted asynchronously right after
  // onboarding (see Onboarding.jsx) — this can render before it lands.
  if (!classCode) return [];
  const { data, error } = await supabase
    .from("users")
    .select("id, display_name, account_type, avatar")
    .eq("class_code", classCode)
    .neq("id", userId)
    .neq("account_type", "org");
  if (error) {
    console.error("Sync (fetch classmates) failed:", error);
    return [];
  }
  return (data || []).map((u) => ({ ...u, avatar: parseAvatar(u.avatar) }));
}

// RLS (users_select) already restricts what comes back to: this user's own
// row, plus rows with discovery_enabled = true where neither side has
// blocked the other — so there's nothing left to filter client-side.
export async function searchUsers(query, excludeUserId) {
  const q = String(query || "").trim();
  if (!q) return [];
  if (DEBUG_MOCK) {
    const match = DEBUG_FRIEND_ID !== excludeUserId && DEBUG_FRIEND.display_name.toLowerCase().includes(q.toLowerCase());
    return match ? [DEBUG_FRIEND] : [];
  }
  const { data, error } = await supabase
    .from("users")
    .select("id, display_name, account_type, avatar")
    .ilike("display_name", `%${q}%`)
    .neq("id", excludeUserId)
    .limit(20);
  if (error) {
    console.error("Sync (search users) failed:", error);
    return [];
  }
  return (data || []).map((u) => ({ ...u, avatar: parseAvatar(u.avatar) }));
}

// Another user's public garden: only their public interests, and only the
// entries under those interests (RLS's entries_select already enforces the
// entry itself being public too, on top of its parent interest). Photos
// aren't included — they're still local-only (see the note up top), so
// there's nothing remote to fetch yet for someone else's album.
export async function pullPublicProfile(userId) {
  if (DEBUG_MOCK && userId === DEBUG_FRIEND_ID) {
    return {
      interests: [rowToInterest(DEBUG_INTEREST_ROW)],
      entries: DEBUG_ENTRY_ROWS.map(rowToEntry),
      photos: [],
    };
  }
  // No .eq("visibility", "public") here — whether someone else's orbs are
  // visible at all is now decided by their own discovery_enabled flag, not
  // a per-orb toggle (see interests_select). RLS already enforces that;
  // this just asks for everything of theirs it's allowed to hand back.
  // Same story for photos: photos_select only ever hands back ones that
  // are both marked public and belong to a discoverable/same-class owner.
  const { data: interestRows, error: intErr } = await supabase
    .from("interests").select("*").eq("user_id", userId);
  if (intErr) {
    console.error("Sync (pull public profile) failed:", intErr);
    return { interests: [], entries: [], photos: [] };
  }
  const ids = (interestRows || []).map((r) => r.id);
  let entryRows = [];
  let photoRows = [];
  if (ids.length) {
    const [entriesRes, photosRes] = await Promise.all([
      supabase.from("entries").select("*").in("interest_id", ids),
      supabase.from("photos").select("*").in("interest_id", ids),
    ]);
    if (entriesRes.error) console.error("Sync (pull public entries) failed:", entriesRes.error);
    else entryRows = entriesRes.data || [];
    if (photosRes.error) console.error("Sync (pull public photos) failed:", photosRes.error);
    else photoRows = photosRes.data || [];
  }
  return {
    interests: (interestRows || []).map(rowToInterest),
    entries: entryRows.map(rowToEntry),
    photos: photoRows.map(rowToPhoto),
  };
}

export async function pullMine(userId) {
  const { data: interestRows, error: intErr } = await supabase
    .from("interests").select("*").eq("user_id", userId);
  if (intErr) {
    console.error("Sync (pull interests) failed:", intErr);
    return { interests: [], entries: [], photos: [] };
  }
  const ids = (interestRows || []).map((r) => r.id);
  let entryRows = [];
  let photoRows = [];
  if (ids.length) {
    const [entriesRes, photosRes] = await Promise.all([
      supabase.from("entries").select("*").in("interest_id", ids),
      supabase.from("photos").select("*").in("interest_id", ids),
    ]);
    if (entriesRes.error) console.error("Sync (pull entries) failed:", entriesRes.error);
    else entryRows = entriesRes.data || [];
    if (photosRes.error) console.error("Sync (pull photos) failed:", photosRes.error);
    else photoRows = photosRes.data || [];
  }
  return {
    interests: (interestRows || []).map(rowToInterest),
    entries: entryRows.map(rowToEntry),
    photos: photoRows.map(rowToPhoto),
  };
}

// ============================================================ community feed

// Real posts from real accounts: entries their author explicitly shared.
// RLS does the access work — entries_select already refuses anything whose
// entry or parent tree isn't public — so this only narrows to the opted-in
// rows and joins on the author for display.
//
// Blocks are filtered here rather than by policy. entries_select checks the
// parent interest inside its own USING clause, and a policy expression does
// not re-apply the referenced table's RLS, so interests_select's block check
// never runs for this path. The data is public either way; blocking is about
// not being shown it, so a client-side filter is the right shape — but it is
// a filter, not a permission boundary.
export async function pullFeed(userId, limit = 40) {
  const [{ data, error }, blocked] = await Promise.all([
    supabase
      .from("entries")
      .select("id, text, minutes, created_at, interest_id, interests!inner(id, name, color, user_id, users!inner(id, display_name, avatar))")
      .eq("shared_to_feed", true)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(limit),
    listBlockedIds(userId),
  ]);
  if (error) {
    // 42703 = column doesn't exist: the feed migration hasn't been applied.
    // An empty feed is the honest answer, not a crash.
    if (error.code !== "42703") console.error("Sync (feed) failed:", error);
    return [];
  }
  return (data || [])
    .filter((r) => r.interests && r.interests.users)
    .filter((r) => r.interests.user_id !== userId)
    .filter((r) => !blocked.has(r.interests.user_id))
    .map((r) => ({
      id: r.id,
      text: r.text,
      minutes: r.minutes,
      createdAt: toMs(r.created_at),
      interestId: r.interest_id,
      hobby: r.interests.name,
      color: r.interests.color,
      authorId: r.interests.users.id,
      authorName: r.interests.users.display_name,
      authorAvatar: parseAvatar(r.interests.users.avatar),
    }));
}

// ===================================================== watching a hobby
// watches points at an interest, never at a user — there is no follows
// table, deliberately (PRD §7). "Keep an eye on this hobby" is a different
// social contract from "follow this child", and the schema is what stops
// the second one being built by accident.

export async function listWatchedIds(userId) {
  if (!userId) return new Set();
  const { data, error } = await supabase
    .from("watches").select("interest_id").eq("user_id", userId);
  if (error) {
    console.error("Sync (watches) failed:", error);
    return new Set();
  }
  return new Set((data || []).map((w) => w.interest_id));
}

export async function watchInterest(userId, interestId) {
  const { error } = await supabase.from("watches").insert({
    id: "wch-" + Math.random().toString(36).slice(2) + Date.now().toString(36),
    user_id: userId,
    interest_id: interestId,
  });
  // 23505 = already watching, which is the state the caller wanted anyway
  if (error && error.code !== "23505") {
    console.error("Sync (watch) failed:", error);
    return false;
  }
  return true;
}

export async function unwatchInterest(userId, interestId) {
  const { error } = await supabase
    .from("watches").delete().eq("user_id", userId).eq("interest_id", interestId);
  if (error) {
    console.error("Sync (unwatch) failed:", error);
    return false;
  }
  return true;
}

// The watched hobbies themselves, for the list in the Me tab.
//
// Two queries rather than one embed, on purpose. A PostgREST embed does not
// re-apply the embedded table's RLS (see pullFeed's note) — so joining
// interests onto watches would keep returning a hobby whose owner has since
// turned discoverability off. Selecting the interests as their own
// top-level query puts them back under interests_select, and anything no
// longer visible simply doesn't come back. Watching something was never a
// claim on it staying visible.
export async function pullWatchedInterests(userId) {
  if (!userId) return [];
  const [{ data: rows, error }, blocked] = await Promise.all([
    supabase
      .from("watches")
      .select("interest_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    listBlockedIds(userId),
  ]);
  if (error) {
    console.error("Sync (watched hobbies) failed:", error);
    return [];
  }
  const ids = (rows || []).map((w) => w.interest_id);
  if (!ids.length) return [];

  const { data, error: interestsError } = await supabase
    .from("interests")
    .select("id, name, color, user_id, users(id, display_name, avatar)")
    .in("id", ids);
  if (interestsError) {
    console.error("Sync (watched hobbies) failed:", interestsError);
    return [];
  }
  return (data || [])
    .filter((i) => i.users)
    .filter((i) => !blocked.has(i.user_id))
    .map((i) => ({
      id: i.id,
      name: i.name,
      color: i.color,
      ownerId: i.users.id,
      ownerName: i.users.display_name,
      ownerAvatar: parseAvatar(i.users.avatar),
    }));
}

export async function listBlockedIds(userId) {
  if (!userId) return new Set();
  const { data, error } = await supabase
    .from("blocks").select("blocked_user_id").eq("user_id", userId);
  if (error) {
    console.error("Sync (blocks) failed:", error);
    return new Set();
  }
  return new Set((data || []).map((b) => b.blocked_user_id));
}

// Hides that account's posts from this user's feed, both directions, and is
// enforced server-side for trees and profiles by interests_select.
export async function blockUser(userId, blockedUserId) {
  const { error } = await supabase
    .from("blocks").insert({ user_id: userId, blocked_user_id: blockedUserId });
  // 23505 = already blocked, which is the state the caller wanted anyway
  if (error && error.code !== "23505") {
    console.error("Sync (block) failed:", error);
    return false;
  }
  return true;
}

// Files a report for a human to review. reports has insert+select-own
// policies and no update policy at all, so nothing here can change a
// report's status — that's deliberately service-role-only.
export async function reportContent(reporterId, targetType, targetId, reason) {
  const { error } = await supabase.from("reports").insert({
    id: "rep-" + Math.random().toString(36).slice(2) + Date.now().toString(36),
    reporter_id: reporterId,
    target_type: targetType,
    target_id: targetId,
    reason,
  });
  if (error) {
    console.error("Sync (report) failed:", error);
    return false;
  }
  return true;
}
