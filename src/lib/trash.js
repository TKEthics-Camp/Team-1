// Recently Deleted: what's in it, what has aged out, and what comes back
// with a tree. Pure, so the store only does the reading and writing.

export const DAY_MS = 86400000;

// Rows past the window go for good; trashed rows inside it stay stored but
// are kept off screen. Returns the rows to show and the rows to destroy.
export function sweepTrash(rows, cutoff) {
  const keep = [], expired = [];
  rows.forEach((r) => {
    if (!r.deletedAt) keep.push(r);
    else if (r.deletedAt < cutoff) expired.push(r);
  });
  return { keep, expired };
}

// One row per thing deleted, newest first. A deleted tree takes its entries
// and photos with it and they come back together, so they aren't listed on
// their own — that would mean dozens of rows for one delete, and a way to
// half-restore a tree.
export function trashList(interests, photos, entries, cutoff) {
  const inWindow = (rows, kind) => rows
    .filter((r) => r.deletedAt && r.deletedAt >= cutoff)
    .map((r) => ({ kind, rec: r, deletedAt: r.deletedAt }));
  const trashedTreeIds = new Set(interests.filter((i) => i.deletedAt).map((i) => i.id));
  return [
    ...inWindow(interests, "interest"),
    ...inWindow(photos.filter((p) => !trashedTreeIds.has(p.interestId)), "photo"),
    ...inWindow(entries.filter((e) => !trashedTreeIds.has(e.interestId)), "entry"),
  ].sort((a, b) => b.deletedAt - a.deletedAt);
}

// The children trashed in the same breath as a tree: deleteInterest stamps
// them all with the tree's own time. An entry deleted by itself last week
// keeps a different stamp, and stays deleted when the tree comes back.
export function trashedWith(rows, tree) {
  return rows.filter((r) => r.interestId === tree.id && r.deletedAt === tree.deletedAt);
}

// A trashed record, back: no deletedAt, and stamped as a fresh edit so the
// server (which holds the trashed copy, stamped when it was deleted) takes it.
export function untrash(rec, touched) {
  const { deletedAt: _deletedAt, ...rest } = rec;
  return touched(rest);
}
