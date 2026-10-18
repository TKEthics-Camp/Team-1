import { useId } from "react";

// The three pictures on the "Pick your look" buttons, drawn rather than
// borrowed from emoji: an emoji is a different drawing on every phone and
// rarely matches anything around it. Each one moves a little — the sun's
// rays turn, the moon's stars twinkle, the screen's two halves trade
// places — and all of it stops for anyone who has asked their device for
// reduced motion (see index.css).
//
// Colours are fixed rather than themed: the sun is warm and the moon is
// cool in either theme, and both read on the dark pill a chosen button
// becomes. Only the screen's frame follows the text colour.
export default function LookIcon({ kind }) {
  const uid = useId().replace(/:/g, "");
  if (kind === "white") return <Sun uid={uid} />;
  if (kind === "black") return <Moon uid={uid} />;
  return <System uid={uid} />;
}

function Sun({ uid }) {
  const core = `sun-core-${uid}`;
  return (
    <svg className="look-ico look-sun" viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <radialGradient id={core} cx="40%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#FFE38A" />
          <stop offset="60%" stopColor="#FFC23D" />
          <stop offset="100%" stopColor="#F59E1B" />
        </radialGradient>
      </defs>
      <g className="look-sun-rays" stroke="#FBB436" strokeWidth="2.2" strokeLinecap="round">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <line key={a} x1="16" y1="3.2" x2="16" y2="6.4" transform={`rotate(${a} 16 16)`} />
        ))}
      </g>
      <circle className="look-sun-core" cx="16" cy="16" r="6.6" fill={`url(#${core})`} />
    </svg>
  );
}

function Moon({ uid }) {
  const body = `moon-body-${uid}`;
  const bite = `moon-bite-${uid}`;
  return (
    <svg className="look-ico look-moon" viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id={body} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C9D2FF" />
          <stop offset="100%" stopColor="#6F7FD8" />
        </linearGradient>
        {/* The crescent is a full disc with a second disc taken out of it. */}
        <mask id={bite}>
          <rect width="32" height="32" fill="#fff" />
          <circle cx="21" cy="11" r="9.2" fill="#000" />
        </mask>
      </defs>
      <g className="look-moon-body">
        <circle cx="14.5" cy="17" r="11" fill={`url(#${body})`} mask={`url(#${bite})`} />
      </g>
      <path className="look-star look-star-a" fill="#FFD66B"
            d="M25 4.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" />
      <path className="look-star look-star-b" fill="#C9D3FF"
            d="M27.6 15.5l.55 1.3 1.3.55-1.3.55-.55 1.3-.55-1.3-1.3-.55 1.3-.55z" />
    </svg>
  );
}

function System({ uid }) {
  const screen = `sys-screen-${uid}`;
  return (
    <svg className="look-ico look-system" viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <clipPath id={screen}>
          <rect x="3" y="4.5" width="26" height="17.5" rx="3" />
        </clipPath>
      </defs>
      {/* Inside the screen: a light half and a dark half that slide past
          each other, with a tiny sun and moon riding along — "whichever
          your device is using right now". */}
      <g clipPath={`url(#${screen})`}>
        <rect x="3" y="4.5" width="26" height="17.5" fill="#FFF1CC" />
        <g className="look-sys-dark">
          <rect x="16" y="4.5" width="26" height="17.5" fill="#343B6B" />
          <circle cx="22" cy="13.2" r="3.4" fill="#C9D2FF" />
          <circle cx="23.5" cy="12" r="2.8" fill="#343B6B" />
        </g>
        <circle className="look-sys-sun" cx="9.5" cy="13.2" r="3.2" fill="#FFB52E" />
      </g>
      <rect x="3" y="4.5" width="26" height="17.5" rx="3" fill="none"
            stroke="currentColor" strokeWidth="2" />
      <path d="M11 28h10M16 22.2V28" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" fill="none" />
    </svg>
  );
}
