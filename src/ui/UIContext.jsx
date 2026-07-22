import { createContext, useContext, useMemo, useState } from "react";
import { today } from "../lib/dates";

const UICtx = createContext(null);

// Transient, non-persisted UI state shared across screens: which sheet (if
// any) is open, which photo is being viewed full-size, and which nudges the
// user has waved off for today.
export function UIProvider({ children }) {
  const [sheet, setSheet] = useState(null); // { type: "entry"|"photo"|"orb"|"student", id?, preset?, student? }
  const [viewer, setViewer] = useState(null); // photo id
  const [dismissed, setDismissed] = useState({}); // interestId -> dateKey

  const value = useMemo(() => ({
    sheet,
    viewer,
    dismissed,
    // A string second arg is an interest id; an object carries extra payload
    // (an Explore preset, or the tapped student).
    openSheet: (type, arg) => setSheet({ type, ...(typeof arg === "string" ? { id: arg } : arg) }),
    closeSheet: () => setSheet(null),
    openViewer: (id) => setViewer(id),
    closeViewer: () => setViewer(null),
    dismissNudge: (id) => setDismissed((d) => ({ ...d, [id]: today() })),
  }), [sheet, viewer, dismissed]);

  return <UICtx.Provider value={value}>{children}</UICtx.Provider>;
}

export function useUI() {
  const ctx = useContext(UICtx);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
