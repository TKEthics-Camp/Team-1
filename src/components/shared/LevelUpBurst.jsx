import { useMemo } from "react";

const PIECES = ["🍃", "🌿", "✨", "🍁"];

// A one-shot burst of leaves behind the "your tree grew" moment on
// SavedScreen. Purely decorative (aria-hidden) — the celebration is the
// text + tree above it; this just makes the moment land.
export default function LevelUpBurst() {
  const pieces = useMemo(() => Array.from({ length: 18 }).map((_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    dur: 1.3 + Math.random() * 0.9,
    rot: Math.round(Math.random() * 360),
    emoji: PIECES[i % PIECES.length],
  })), []);

  return (
    <div className="confetti-wrap" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{ left: p.left + "%", animationDelay: p.delay + "s", animationDuration: p.dur + "s", "--rot": p.rot + "deg" }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
