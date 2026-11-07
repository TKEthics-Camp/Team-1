// Which copy of a record wins when this device and the server both have
// it: the one whose last edit is newer. Every edit is stamped when it is
// made (StoreContext's touched), and the server keeps the newest stamp on
// its side (20261017010000). See PRD §14.6.

function stamp(r) {
  return (r && (r.updatedAt || r.createdAt)) || 0;
}

// "pull" — the server's copy is newer; "push" — this device's is; "same".
export function newerSide(local, remote) {
  const l = stamp(local), r = stamp(remote);
  if (r > l) return "pull";
  if (l > r) return "push";
  return "same";
}

// Unset and null are the same thing here: a row from the server says null, a
// record that never finished uploading has no such field at all.
function differs(a, b) {
  return (a || null) !== (b || null);
}

// The server's newer copy, keeping what only this device holds (the photo
// or recording bytes) unless the newer copy points at a different file.
//
// A recording that was re-made keeps the same path (an entry has one file),
// so its length is what shows these bytes are the old take.
export function mergePulled(store, local, remote) {
  const merged = { ...local, ...remote };
  if (store === "photos" && differs(local.storagePath, remote.storagePath)) delete merged.blob;
  if (store === "entries" && (differs(local.audioPath, remote.audioPath) || differs(local.audioMs, remote.audioMs))) {
    delete merged.audio;
  }
  return merged;
}
