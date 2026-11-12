import { useRef } from "react";

// How far down a sheet has to be pulled to let go of it, and how fast a
// shorter flick has to be to count as the same thing.
const DISMISS_PX = 110;
const FLICK_PX = 30;
const FLICK_SPEED = 0.6; // px per ms

// `className` lets a sheet opt into a different treatment — the add/edit tree
// sheet passes "tree-sheet" for the Figma's flat white card. Omitting it keeps
// the themed shelf every other sheet uses.
//
// A sheet can be pulled down by its handle to close it, as one can anywhere
// else on a phone. Only the strip at the top takes the drag, so it never
// fights the sheet's own scrolling or a field inside it.
export default function Sheet({ onClose, children, className = "" }) {
  const sheet = useRef(null);
  const drag = useRef(null);

  function onDown(e) {
    drag.current = { from: e.clientY, at: performance.now(), dy: 0 };
    // Capture keeps the drag alive when the finger leaves the strip. Without
    // it the drag still works for as long as the finger stays on it.
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not supported */ }
    sheet.current.style.transition = "none";
  }
  function onMove(e) {
    if (!drag.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.from);
    sheet.current.style.transform = `translateY(${drag.current.dy}px)`;
  }
  function onUp() {
    const d = drag.current;
    drag.current = null;
    const el = sheet.current;
    if (!d || !el) return;
    const speed = d.dy / Math.max(1, performance.now() - d.at);
    if (d.dy > DISMISS_PX || (d.dy > FLICK_PX && speed > FLICK_SPEED)) {
      el.style.transition = "transform .2s ease-in";
      el.style.transform = "translateY(100%)";
      setTimeout(onClose, 170);
    } else {
      el.style.transition = "transform .32s cubic-bezier(.32, .72, 0, 1)";
      el.style.transform = "";
    }
  }

  return (
    <div className="sheet-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={"sheet " + className} ref={sheet}>
        <div
          className="sheet-grab"
          aria-hidden="true"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
        {children}
      </div>
    </div>
  );
}
