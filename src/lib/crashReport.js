// Sends a short report when the app crashes, so a crash is found by someone
// other than the child it happened to (PRD §14.10). Goes to the project's
// own database through report_crash() (20261114000000) — no third party.
//
// What goes: the error's message and stack, the screen (record ids blanked
// out), the app's version, and web or iPhone. Never anything the student
// wrote, photographed or recorded. Only while signed in, since a report
// belongs to an account and goes when the account does.
//
// Never throws, never retries, and sends each distinct crash once per
// session (at most five), so reporting can't make a bad moment worse.
import { supabase } from "./supabase";

const MAX_PER_SESSION = 5;
const sent = new Set();

// Paths name records: /interest/<uuid>, /user/<uuid>/interest/<uuid>. The
// screen is what matters, not whose tree it was.
export function screenOf(pathname) {
  return String(pathname || "")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
    .replace(/\/[A-Za-z0-9_-]{16,}(?=\/|$)/g, "/:id")
    .slice(0, 200);
}

export function describeError(error) {
  if (error instanceof Error) return { message: `${error.name}: ${error.message}`, stack: error.stack || null };
  if (typeof error === "string") return { message: error, stack: null };
  try {
    return { message: JSON.stringify(error) || String(error), stack: null };
  } catch {
    return { message: String(error), stack: null };
  }
}

/**
 * @param {unknown} error
 * @param {{ componentStack?: string }} [extra]
 * @param {{ rpc: (name: string, args: object) => PromiseLike<any>, auth: { getSession: () => PromiseLike<any> } }} [client]
 */
export async function reportCrash(error, extra = {}, client = supabase) {
  try {
    const { message, stack } = describeError(error);
    if (!message || sent.has(message) || sent.size >= MAX_PER_SESSION) return false;
    sent.add(message);
    const { data } = await client.auth.getSession();
    if (!data || !data.session) return false;
    const fullStack = [stack, extra.componentStack].filter(Boolean).join("\n--- component stack ---\n") || null;
    const { error: rpcError } = await client.rpc("report_crash", {
      p_message: message,
      p_stack: fullStack,
      p_where: screenOf(typeof location !== "undefined" ? location.pathname : ""),
      p_version: import.meta.env.VITE_APP_VERSION || "dev",
      p_platform: document.documentElement.classList.contains("native") ? "ios" : "web",
    });
    return !rpcError;
  } catch {
    return false;
  }
}

// Errors that never reach a React error boundary: a failed promise nothing
// awaited, an exception in an event handler or a timer.
export function reportUncaughtErrors() {
  window.addEventListener("error", (e) => { reportCrash(e.error || e.message); });
  window.addEventListener("unhandledrejection", (e) => { reportCrash(e.reason); });
}

// For tests: forget what this session has already sent.
export function _resetSent() {
  sent.clear();
}
