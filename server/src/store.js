import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// A tiny JSON-file store, keyed by deviceId. Fine for the handful of devices
// a personal/school app like this actually has — swap for a real DB if that
// ever stops being true. Every mutation writes the whole file straight away;
// Node is single-threaded and calls here aren't concurrent, so no locking.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "devices.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

let devices = load();

function persist() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(devices, null, 2));
}

export function upsertDevice(deviceId, fields) {
  const existing = devices[deviceId] || { interests: [] };
  devices[deviceId] = { ...existing, ...fields };
  persist();
  return devices[deviceId];
}

export function setInterests(deviceId, interests, extra) {
  const existing = devices[deviceId];
  if (!existing) return null;
  // Preserve each interest's per-day "already sent" markers across syncs —
  // only the schedule-relevant fields (name/time/lastLoggedDayKey) come from
  // the client; `sent` bookkeeping lives here so we never double-notify.
  const prevById = new Map((existing.interests || []).map((it) => [it.id, it]));
  existing.interests = interests.map((it) => ({
    ...it,
    sent: (prevById.get(it.id) || {}).sent || {},
  }));
  Object.assign(existing, extra);
  persist();
  return existing;
}

export function markSent(deviceId, interestId, key, dayKey) {
  const d = devices[deviceId];
  if (!d) return;
  const it = (d.interests || []).find((x) => x.id === interestId);
  if (!it) return;
  it.sent = it.sent || {};
  it.sent[key] = dayKey;
  persist();
}

export function removeDevice(deviceId) {
  delete devices[deviceId];
  persist();
}

export function allDevices() {
  return devices;
}
