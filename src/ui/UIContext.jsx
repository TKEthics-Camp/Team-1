import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { today } from "../lib/dates";
import { loadSession, saveSession, clearSession, sessionMinutes } from "../lib/sessionTimer";

const UICtx = createContext(null);

// Transient UI state shared across screens: which sheet (if any) is open,
// which photo is being viewed full-size, which nudges the user has waved off
// for today, the reward shown after a log, and a running session timer —
// the one thing here that outlives a reload.
export function UIProvider({ children }) {
  const [sheet, setSheet] = useState(null); // { type: "entry"|"photo"|"orb"|"student", id?, preset?, student? }
  const [viewer, setViewer] = useState(null); // photo id
  const [dismissed, setDismissed] = useState({}); // interestId -> dateKey
  // A pending "undo" toast: { message, timerId, restore, commit }. Only one
  // at a time — offering a new one commits whatever was already pending
  // rather than losing it silently.
  const [undo, setUndo] = useState(null);
  const undoRef = useRef(null);
  useEffect(() => { undoRef.current = undo; }, [undo]);
  // This unmounts at sign-out, which wipes the device's copy. A delete still
  // inside its undo window would otherwise commit a few seconds later into
  // the wiped database — leaving the trashed row behind for whoever signs in
  // next. ProfileScreen commits it first (flushUndo); this is for any other
  // way out.
  useEffect(() => () => { if (undoRef.current) clearTimeout(undoRef.current.timerId); }, []);
  // A plain "here's what just happened" note — no action attached, unlike
  // `undo` above. Separate state so a coin toast and a pending delete can
  // never evict one another; they stack rather than compete.
  const [toast, setToast] = useState(null); // { id, message }
  const toastQueue = useRef([]);
  const toastTimer = useRef(null);
  const toastShowing = useRef(false);
  // Held in a ref so it can re-enter itself as the queue drains without
  // showToast having to change identity between renders.
  const pumpToast = useRef(() => {});
  pumpToast.current = () => {
    const next = toastQueue.current.shift();
    if (!next) { toastShowing.current = false; setToast(null); return; }
    toastShowing.current = true;
    setToast({ id: next.id, message: next.message });
    toastTimer.current = setTimeout(() => pumpToast.current(), next.ms);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // The moment after a log: what it changed (lib/logOutcome), shown once
  // over the whole app, then gone on a tap or by itself.
  const [celebration, setCelebration] = useState(null);
  // A running session timer (lib/sessionTimer). Read back from the device
  // on mount, so a session started before the app was closed is still
  // running when it reopens.
  const [session, setSession] = useState(() => loadSession());

  const value = useMemo(() => ({
    sheet,
    viewer,
    dismissed,
    undo,
    toast,
    // A string second arg is an interest id; an object carries extra payload
    // (an Explore preset, or the tapped student).
    openSheet: (type, arg) => setSheet({ type, ...(typeof arg === "string" ? { id: arg } : arg) }),
    closeSheet: () => setSheet(null),
    openViewer: (id) => setViewer(id),
    closeViewer: () => setViewer(null),
    celebration,
    celebrate: (outcome) => setCelebration({ id: Date.now() + Math.random(), ...outcome }),
    closeCelebration: () => setCelebration(null),
    session,
    startSession: (interestId) => {
      const next = { interestId, startedAt: Date.now() };
      saveSession(next);
      setSession(next);
    },
    // Stops the timer and hands back what it measured, for the log sheet.
    endSession: () => {
      if (!session) return null;
      const result = { interestId: session.interestId, minutes: sessionMinutes(session) };
      clearSession();
      setSession(null);
      return result;
    },
    cancelSession: () => {
      clearSession();
      setSession(null);
    },
    // Waves the nudge off for the rest of today (a dateKey string).
    dismissNudge: (id) => setDismissed((d) => ({ ...d, [id]: today() })),
    // Waves it off for a short while instead of the whole day (a future
    // timestamp) — for "ask me again in a bit" rather than "not today".
    snoozeNudge: (id, minutes = 45) => setDismissed((d) => ({ ...d, [id]: Date.now() + minutes * 60000 })),
    // A destructive action (delete a photo, delete a tree) has already
    // happened optimistically in the caller's own state — this just holds
    // the door open for a few seconds before the *permanent* part (the
    // IndexedDB/remote delete, passed as `commit`) actually runs. Tapping
    // Undo in that window calls `restore` instead and cancels the commit.
    offerUndo: (message, restore, commit, ms = 6000) => {
      if (undoRef.current) { clearTimeout(undoRef.current.timerId); undoRef.current.commit(); }
      const timerId = setTimeout(() => { commit(); setUndo(null); }, ms);
      setUndo({ message, timerId, restore, commit });
    },
    // Fire-and-forget confirmation. The id changes on every call so the
    // component can re-key and replay its entrance even when the same
    // message fires twice in a row.
    //
    // Queued rather than replaced: one action can raise two notes — logging
    // pays coins *and* can unlock a badge — and whichever landed second used
    // to stomp the first, so which reward you were actually shown came down
    // to timing. They now wait their turn.
    showToast: (message, ms = 2600) => {
      toastQueue.current.push({ id: Date.now() + Math.random(), message, ms });
      if (!toastShowing.current) pumpToast.current();
    },
    // Commits a pending delete right now instead of when its window closes.
    flushUndo: () => {
      const u = undoRef.current;
      if (!u) return;
      clearTimeout(u.timerId);
      undoRef.current = null;
      u.commit();
      setUndo(null);
    },
    undoNow: () => {
      setUndo((u) => {
        if (!u) return u;
        clearTimeout(u.timerId);
        u.restore();
        return null;
      });
    },
  }), [sheet, viewer, dismissed, undo, toast, celebration, session]);

  return <UICtx.Provider value={value}>{children}</UICtx.Provider>;
}

export function useUI() {
  const ctx = useContext(UICtx);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
