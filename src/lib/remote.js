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
  time: null,
  friends: [],
  visibility: "public",
  category: null,
  inspired_by: null,
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

export function interestToRow(rec, userId, legacy = false) {
  const row = {
    id: rec.id,
    user_id: userId,
    name: rec.name,
    why: rec.why || "",
    color: rec.color || "",
    time: rec.time || null,
    friends: rec.friends || [],
    visibility: rec.visibility || "private",
    category: rec.category || null,
    inspired_by: rec.inspiredBy || null,
    created_at: toIso(rec.createdAt),
    updated_at: toIso(rec.updatedAt || rec.createdAt),
  };
  return legacy ? row : { ...row, ...appearanceColumns(rec) };
}

export function rowToInterest(row) {
  return {
    id: row.id,
    name: row.name,
    why: row.why,
    color: row.color,
    time: row.time,
    friends: row.friends || [],
    visibility: row.visibility,
    category: row.category,
    inspiredBy: row.inspired_by,
    days: row.days || [],
    species: row.species || null,
    leafColor: row.leaf_color || null,
    revivedAt: row.revived_at ? toMs(row.revived_at) : undefined,
    createdAt: toMs(row.created_at),
    updatedAt: toMs(row.updated_at),
  };
}

export function entryToRow(rec, legacy = false) {
  const row = {
    id: rec.id,
    interest_id: rec.interestId,
    date: rec.date,
    text: rec.text || "",
    minutes: rec.minutes ?? 30,
    visibility: rec.visibility || "private",
    is_pinned: !!rec.isPinned,
    created_at: toIso(rec.createdAt),
    updated_at: toIso(rec.updatedAt || rec.createdAt),
  };
  // shared_to_feed only exists once 20260901000000_feed_posts.sql is applied.
  // Sending it to a project without the column would fail the whole upsert,
  // so every entry would stop syncing — see pushEntry's retry.
  return legacy ? row : { ...row, shared_to_feed: !!rec.sharedToFeed };
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
    createdAt: toMs(row.created_at),
  };
}

// Every push is fire-and-forget from the caller's perspective (writes
// already landed locally first — local-first means the UI never waits on
// the network); failures are logged, not surfaced, since the local copy
// stays the source of truth until the next successful sync.

export async function pushInterest(rec, userId) {
  let { error } = await supabase.from("interests").upsert(interestToRow(rec, userId));
  // PGRST204 = unknown column: the appearance-columns migration isn't applied
  // to this project yet. Retry with the original column set so sync still
  // works (losing only the new fields, as before) instead of failing whole.
  if (error && error.code === "PGRST204") {
    ({ error } = await supabase.from("interests").upsert(interestToRow(rec, userId, true)));
  }
  if (error) console.error("Sync (interest) failed:", error);
}

export async function deleteRemoteInterest(id) {
  const { error } = await supabase.from("interests").delete().eq("id", id);
  if (error) console.error("Sync (delete interest) failed:", error);
}

export async function pushEntry(rec) {
  let { error } = await supabase.from("entries").upsert(entryToRow(rec));
  // PGRST204 = unknown column: the feed migration isn't applied here yet.
  // Retry without it so entries still sync (losing only the share flag)
  // rather than the whole write failing.
  if (error && error.code === "PGRST204") {
    ({ error } = await supabase.from("entries").upsert(entryToRow(rec, true)));
  }
  if (error) console.error("Sync (entry) failed:", error);
}

export async function deleteRemoteEntry(id) {
  const { error } = await supabase.from("entries").delete().eq("id", id);
  if (error) console.error("Sync (delete entry) failed:", error);
}

export async function pushPhotoRow(rec) {
  const { error } = await supabase.from("photos").upsert(photoToRow(rec));
  if (error) console.error("Sync (photo) failed:", error);
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

export async function updateDiscovery(userId, enabled) {
  const { error } = await supabase.from("users").update({ discovery_enabled: enabled }).eq("id", userId);
  if (error) console.error("Sync (discovery) failed:", error);
}

// The real signal StoreContext's reconciliation uses to tell "finished
// onboarding" apart from "just signed up" — display_name alone stopped
// working for this once AuthFlow started setting it at signup, before
// onboarding runs, to reserve the username early.
export async function markOnboardingComplete(userId) {
  const { error } = await supabase.from("users").update({ onboarding_completed: true }).eq("id", userId);
  if (error) console.error("Sync (onboarding complete) failed:", error);
}

// Deliberately its own write rather than folded into markOnboardingComplete
// above, even though both fire at the same moment. Combining them means a
// missing daily_goal column (migration not applied yet) fails the whole
// statement, so onboarding_completed wouldn't be set either — which is
// exactly the "every signup looks un-onboarded" bug that flag exists to fix.
// Separate writes fail independently.
export async function updateDailyGoal(userId, minutes) {
  const { error } = await supabase.from("users").update({ daily_goal: minutes }).eq("id", userId);
  if (error) console.error("Sync (daily goal) failed:", error);
}

// users.avatar is text, not jsonb — the avatar customization (skin, hair,
// hair colour, outfit, outfit colour) is stored as a JSON string so a
// device other than the one that made the edit can pick it up too.
export async function updateAvatar(userId, avatar) {
  const { error } = await supabase.from("users").update({ avatar: JSON.stringify(avatar) }).eq("id", userId);
  if (error) console.error("Sync (avatar) failed:", error);
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
export async function setMyClassCode(userId, code) {
  const { error } = await supabase.from("users").update({ class_code: code }).eq("id", userId);
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
  await setMyClassCode(userId, code);
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
      if (existing) await setMyClassCode(userId, existing);
      return existing;
    }
    if (!result.taken) break;
  }
  return null;
}

// Whether a typed code belongs to a real class, checked before the typing
// account has joined anything — see classes_select in the migration for
// why this can't go through users_select instead.
export async function classCodeExists(code) {
  const { data, error } = await supabase.from("classes").select("code").eq("code", code).maybeSingle();
  if (error) {
    console.error("Sync (check class code) failed:", error);
    return false;
  }
  return !!data;
}

export async function joinClass(userId, code) {
  const { error } = await supabase.from("users").update({ class_code: code }).eq("id", userId);
  if (error) {
    console.error("Sync (join class) failed:", error);
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
