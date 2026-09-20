// The streak icon. Two stacked flame shapes — an outer body and a brighter
// inner core — each licking on its own timing so the silhouette actually
// changes shape instead of an emoji being rotated back and forth. The
// layers deliberately run at rates that don't divide into each other, so
// they drift in and out of phase and never settle into a visible loop.
//
// A rest day swaps the whole thing for a leaf: a protected streak has to
// read as held, not burning. Same footprint so the chip doesn't reflow.
//
// Animations live in apple.css under `.streak-ico`; with the stylesheet
// missing this still renders as a correct, static flame.
export default function StreakFlame({ resting = false, size = 15 }) {
  return (
    <svg
      className={"streak-ico" + (resting ? " resting" : "")}
      width={size}
      height={Math.round((size * 4) / 3)}
      viewBox="0 0 24 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="streakOuter" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFA62E" />
          <stop offset="1" stopColor="#F4502A" />
        </linearGradient>
        <linearGradient id="streakInner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE680" />
          <stop offset="1" stopColor="#FFB01F" />
        </linearGradient>
        <linearGradient id="streakLeaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6FD196" />
          <stop offset="1" stopColor="#2E9E63" />
        </linearGradient>
      </defs>

      {resting ? (
        <g className="streak-leaf">
          <path
            d="M19.5 6 C 19.5 17.5 13.8 24 5.5 24.5 C 4.2 16 9.4 7.6 19.5 6 Z"
            fill="url(#streakLeaf)"
          />
          <path
            d="M18 7.6 C 12.4 11.4 8.2 16.6 6.2 23.2"
            stroke="rgba(255,255,255,.55)"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      ) : (
        <>
          <path
            className="streak-flame-outer"
            d="M12 1.6 C 12 1.6 14.3 6.6 16.5 9.4 C 19 12.6 20.6 15.5 20.6 19 C 20.6 24.6 16.8 28.7 12 28.7 C 7.2 28.7 3.4 24.6 3.4 19 C 3.4 15.8 4.7 13.3 6.5 10.7 C 7.5 12.8 8.8 13.8 10 14 C 11.2 14.2 11.3 11.5 10.7 9.1 C 10.2 7.1 11 3.7 12 1.6 Z"
            fill="url(#streakOuter)"
          />
          <path
            className="streak-flame-core"
            d="M12 12.4 C 12 12.4 14.7 15.6 15.3 18.6 C 16 22.1 14.4 25.2 12 25.2 C 9.6 25.2 8 22.1 8.7 18.6 C 9.2 16.3 10.6 14.4 12 12.4 Z"
            fill="url(#streakInner)"
          />
        </>
      )}
    </svg>
  );
}
