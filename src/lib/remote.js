import { supabase } from "./supabase";

// DEBUG ONLY: mirrors the flag in AuthContext.jsx. When set, searchUsers and
// pullPublicProfile serve one fixture "friend" instead of hitting Supabase,
// so the search -> view-another-user's-orb flow can be tested without a
// second real account. Never set outside local dev.
const DEBUG_MOCK = import.meta.env.VITE_DEBUG_SKIP_AUTH === "true";
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

export function interestToRow(rec, userId) {
  return {
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
    createdAt: toMs(row.created_at),
    updatedAt: toMs(row.updated_at),
  };
}

// Every push is fire-and-forget from the caller's perspective (writes
// already landed locally first — local-first means the UI never waits on
// the network); failures are logged, not surfaced, since the local copy
// stays the source of truth until the next successful sync.

export async function pushInterest(rec, userId) {
  const { error } = await supabase.from("interests").upsert(interestToRow(rec, userId));
  if (error) console.error("Sync (interest) failed:", error);
}

export async function deleteRemoteInterest(id) {
  const { error } = await supabase.from("interests").delete().eq("id", id);
  if (error) console.error("Sync (delete interest) failed:", error);
}

export async function pushEntry(rec) {
  const { error } = await supabase.from("entries").upsert(entryToRow(rec));
  if (error) console.error("Sync (entry) failed:", error);
}

export async function deleteRemoteEntry(id) {
  const { error } = await supabase.from("entries").delete().eq("id", id);
  if (error) console.error("Sync (delete entry) failed:", error);
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

export async function updateDisplayName(userId, name) {
  const { error } = await supabase.from("users").update({ display_name: name }).eq("id", userId);
  if (error) {
    console.error("Sync (display name) failed:", error);
    // 23505 = unique_violation — the users_display_name_unique_idx guard.
    return { ok: false, taken: error.code === "23505" };
  }
  return { ok: true };
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
    .select("id, display_name, account_type")
    .ilike("display_name", `%${q}%`)
    .neq("id", excludeUserId)
    .limit(20);
  if (error) {
    console.error("Sync (search users) failed:", error);
    return [];
  }
  return data || [];
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
    };
  }
  const { data: interestRows, error: intErr } = await supabase
    .from("interests").select("*").eq("user_id", userId).eq("visibility", "public");
  if (intErr) {
    console.error("Sync (pull public profile) failed:", intErr);
    return { interests: [], entries: [] };
  }
  const ids = (interestRows || []).map((r) => r.id);
  let entryRows = [];
  if (ids.length) {
    const { data, error } = await supabase.from("entries").select("*").in("interest_id", ids);
    if (error) console.error("Sync (pull public entries) failed:", error);
    else entryRows = data || [];
  }
  return {
    interests: (interestRows || []).map(rowToInterest),
    entries: entryRows.map(rowToEntry),
  };
}

export async function pullMine(userId) {
  const { data: interestRows, error: intErr } = await supabase
    .from("interests").select("*").eq("user_id", userId);
  if (intErr) {
    console.error("Sync (pull interests) failed:", intErr);
    return { interests: [], entries: [] };
  }
  const ids = (interestRows || []).map((r) => r.id);
  let entryRows = [];
  if (ids.length) {
    const { data, error } = await supabase.from("entries").select("*").in("interest_id", ids);
    if (error) console.error("Sync (pull entries) failed:", error);
    else entryRows = data || [];
  }
  return {
    interests: (interestRows || []).map(rowToInterest),
    entries: entryRows.map(rowToEntry),
  };
}
