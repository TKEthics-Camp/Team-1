import { lastLoggedDay } from "./derived";

// The push server this app talks to (see /server). Set VITE_PUSH_SERVER_URL
// when deploying the frontend somewhere other than the same host as the
// server; defaults to the local dev server.
const SERVER_URL = import.meta.env.VITE_PUSH_SERVER_URL || "http://localhost:8787";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function localTz() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function getDeviceId() {
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("deviceId", id);
  }
  return id;
}

export function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

// Call once, right after Notification permission is granted. Registers the
// service worker, creates (or reuses) a PushSubscription, and hands it to
// the server so it can send real banners even once this tab is closed.
export async function registerPush(lang) {
  if (!pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const { publicKey } = await fetch(`${SERVER_URL}/api/vapid-public-key`).then((r) => r.json());

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    await fetch(`${SERVER_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: getDeviceId(), subscription: sub, tz: localTz(), lang }),
    });
    return true;
  } catch (e) {
    console.error("registerPush failed:", e);
    return false;
  }
}

// Best-effort: tells the server the current schedule (hobby name + usual
// time) and, for each, the last local day it was actually logged — nothing
// else about the journal/photos ever leaves the device. Safe to call often;
// no-ops quietly if the device was never registered or the server's offline.
export async function syncSchedule(interests, entries, photos, lang) {
  if (!localStorage.getItem("deviceId")) return;
  const payload = interests.map((it) => ({
    id: it.id,
    name: it.name,
    time: it.time || null,
    // Missing/empty means every day — sent as null so the server applies the
    // same "no restriction" rule instead of needing its own default.
    days: it.days && it.days.length && it.days.length < 7 ? it.days : null,
    lastLoggedDayKey: lastLoggedDay(entries, photos, it.id),
  }));
  try {
    await fetch(`${SERVER_URL}/api/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: getDeviceId(), interests: payload, lang, tz: localTz() }),
    });
  } catch (e) {
    // offline or server unreachable — fine, next change will retry
  }
}
