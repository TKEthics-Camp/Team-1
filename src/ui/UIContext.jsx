import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { today } from "../lib/dates";

const UICtx = createContext(null);

// Transient, non-persisted UI state shared across screens: which sheet (if
// any) is open, which photo is being viewed full-size, and which nudges the
// user has waved off for today.
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

  const value = useMemo(() => ({
    sheet,
    viewer,
    dismissed,
    undo,
    // A string second arg is an interest id; an object carries extra payload
    // (an Explore preset, or the tapped student).
    openSheet: (type, arg) => setSheet({ type, ...(typeof arg === "string" ? { id: arg } : arg) }),
    closeSheet: () => setSheet(null),
    openViewer: (id) => setViewer(id),
    closeViewer: () => setViewer(null),
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
    undoNow: () => {
      setUndo((u) => {
        if (!u) return u;
        clearTimeout(u.timerId);
        u.restore();
        return null;
      });
    },
  }), [sheet, viewer, dismissed, undo]);

  return <UICtx.Provider value={value}>{children}</UICtx.Provider>;
}

export function useUI() {
  const ctx = useContext(UICtx);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
