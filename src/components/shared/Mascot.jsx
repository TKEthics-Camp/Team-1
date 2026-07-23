// Sprig — the app's mascot. A small sprout with a friendly face, built from
// the same flat-cute visual language as the trees and PersonAvatar: round
// shapes, big dot eyes, blush cheeks. Used in the guided tour and anywhere
// else the app wants to "talk" to the user directly.
export default function Mascot({ size = 56, className = "" }) {
  return (
    <svg
      className={"mascot-svg " + className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="sprigBody" cx="38%" cy="30%" r="75%">
          <stop offset="0" stopColor="#7FE0A6" />
          <stop offset="1" stopColor="#2E9E63" />
        </radialGradient>
      </defs>

      {/* little root stub, planted */}
      <rect x="46" y="86" width="8" height="10" rx="3" fill="#8B5A2B" />
      <ellipse cx="50" cy="97" rx="20" ry="4" fill="rgba(0,0,0,.12)" />

      {/* leaf ears/arms */}
      <ellipse cx="20" cy="58" rx="13" ry="8" fill="url(#sprigBody)" transform="rotate(-24 20 58)" />
      <ellipse cx="80" cy="58" rx="13" ry="8" fill="url(#sprigBody)" transform="rotate(24 80 58)" />

      {/* body */}
      <circle cx="50" cy="56" r="34" fill="url(#sprigBody)" />

      {/* little sprout leaves on top of the head */}
      <ellipse cx="43" cy="26" rx="7" ry="4.5" fill="url(#sprigBody)" transform="rotate(-30 43 26)" />
      <ellipse cx="57" cy="24" rx="7" ry="4.5" fill="url(#sprigBody)" transform="rotate(30 57 24)" />

      {/* gloss */}
      <ellipse cx="36" cy="42" rx="9" ry="6" fill="rgba(255,255,255,.3)" />

      {/* face */}
      <circle cx="40" cy="58" r="4" fill="#264E3A" />
      <circle cx="60" cy="58" r="4" fill="#264E3A" />
      <path d="M40 68 Q50 76 60 68" stroke="#264E3A" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <circle cx="30" cy="64" r="4" fill="#FF9DBB" opacity=".6" />
      <circle cx="70" cy="64" r="4" fill="#FF9DBB" opacity=".6" />
    </svg>
  );
}
