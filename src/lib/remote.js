import { supabase } from "./supabase";

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
