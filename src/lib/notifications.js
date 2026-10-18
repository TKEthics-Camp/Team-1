import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

// Notification permission and delivery, on whichever platform this is.
//
// In a browser: the Notification API, which only works while the tab is
// open. Inside the iPhone app: iOS local notifications, scheduled ahead so
// they arrive when Forest is closed. WKWebView has no Notification API at
// all, so without this the iPhone app could never remind anybody.
//
// Permission comes back as one of four words everywhere:
//   "granted"      reminders are on
//   "prompt"       never asked; asking will show the system question
//   "denied"       said no — only the system's own Settings can undo that
//   "unsupported"  this browser has no notifications at all

const native = Capacitor.isNativePlatform();
const PERMISSION_EVENT = "forest:notification-permission";

let pluginPromise = null;
function plugin() {
  if (!pluginPromise) {
    pluginPromise = import("@capacitor/local-notifications").then((m) => m.LocalNotifications);
  }
  return pluginPromise;
}

function fromNative(display) {
  if (display === "granted") return "granted";
  if (display === "denied") return "denied";
  return "prompt"; // "prompt" and "prompt-with-rationale"
}

function fromWeb() {
  if (!window.Notification) return "unsupported";
  const p = Notification.permission;
  return p === "default" ? "prompt" : p;
}

export function isNative() {
  return native;
}

export async function notificationPermission() {
  if (!native) return fromWeb();
  try {
    const result = await (await plugin()).checkPermissions();
    return fromNative(result.display);
  } catch {
    return "unsupported";
  }
}

// Shows the system question if it has never been answered. A "no" can't be
// asked again from inside an app — iOS and browsers both refuse — so this
// is a no-op after one, and the screen says where to change it instead.
export async function requestNotificationPermission() {
  let result;
  if (native) {
    try {
      result = fromNative((await (await plugin()).requestPermissions()).display);
    } catch {
      result = "unsupported";
    }
  } else if (window.Notification && Notification.permission === "default") {
    try {
      result = (await Notification.requestPermission()) === "granted" ? "granted" : fromWeb();
    } catch {
      result = fromWeb();
    }
  } else {
    result = fromWeb();
  }
  // Anything that schedules reminders re-plans when the answer changes.
  window.dispatchEvent(new CustomEvent(PERMISSION_EVENT, { detail: result }));
  return result;
}

export function onPermissionChange(fn) {
  const handler = (e) => fn(e.detail);
  window.addEventListener(PERMISSION_EVENT, handler);
  return () => window.removeEventListener(PERMISSION_EVENT, handler);
}

// Current permission as React state. Re-checked when the app comes back to
// the front, because the place a "no" gets changed is the Settings app, and
// coming back from it is exactly that.
export function useNotificationPermission() {
  const [permission, setPermission] = useState(native ? null : fromWeb());

  useEffect(() => {
    let cancelled = false;
    const check = () => notificationPermission().then((p) => { if (!cancelled) setPermission(p); });
    check();
    const offChange = onPermissionChange((p) => { if (!cancelled) setPermission(p); });
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      offChange();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return permission;
}

// Replaces everything this app has scheduled with `plan` (see reminderPlan).
// Replace rather than patch: the plan is cheap to rebuild and always
// reflects the garden as it is now, so there is nothing worth diffing.
// Calls are queued so two quick changes can't interleave their cancel and
// schedule halves.
let queue = Promise.resolve();
export function replaceScheduledReminders(plan) {
  if (!native) return Promise.resolve();
  queue = queue.then(async () => {
    try {
      const LocalNotifications = await plugin();
      const perm = await LocalNotifications.checkPermissions();
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length) {
        await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
      }
      if (perm.display !== "granted" || !plan.length) return;
      await LocalNotifications.schedule({
        notifications: plan.map((p) => ({
          id: p.id,
          title: p.title,
          body: p.body,
          schedule: { at: p.at, allowWhileIdle: true },
          extra: { path: p.path },
        })),
      });
    } catch (err) {
      console.error("Scheduling reminders failed:", err);
    }
  });
  return queue;
}

// Where a tapped reminder wants to go. Only the iPhone app has anything to
// listen to; in a browser, clicking a notification just focuses the tab.
export function onReminderTapped(fn) {
  if (!native) return () => {};
  let handle = null;
  let removed = false;
  plugin().then((LocalNotifications) =>
    LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
      const path = event && event.notification && event.notification.extra && event.notification.extra.path;
      if (typeof path === "string" && path.startsWith("/")) fn(path);
    })
  ).then((h) => {
    if (removed) h.remove(); else handle = h;
  }).catch(() => {});
  return () => {
    removed = true;
    if (handle) handle.remove();
  };
}

// A tapped reminder can arrive before there is anywhere to go: on a cold
// start the router mounts only after sign-in and the local data have
// loaded. So the destination is held here, taken by the router when it
// mounts (takeOpenPath), and announced to it if it is already up
// (onOpenPath).
const OPEN_EVENT = "forest:open-path";
let openPath = null;

export function listenForReminderTaps() {
  return onReminderTapped((path) => {
    openPath = path;
    window.dispatchEvent(new CustomEvent(OPEN_EVENT));
  });
}

export function takeOpenPath() {
  const path = openPath;
  openPath = null;
  return path;
}

export function onOpenPath(fn) {
  const handler = () => {
    const path = takeOpenPath();
    if (path) fn(path);
  };
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
}
