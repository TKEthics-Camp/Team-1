// Sprig — the app's mascot. A sprout with a friendly face, built from the
// same flat-cute visual language as the trees and PersonAvatar: round
// shapes, big dot eyes, blush cheeks.
//
// `action` makes him do something rather than just sit there. Every moving
// part is a <g> wrapper that carries no transform of its own, with the
// static placement living on the shape *inside* it. That split matters: a
// CSS `transform` on an SVG element replaces its `transform` attribute
// rather than composing with it, so animating a shape that carries its own
// rotate() attribute tears it off the body. Wrapper animates, shape stays
// put. The animations live in apple.css under `.sprig[data-action]`, and
// every action degrades to the plain drawing if the CSS never loads.
//
//   idle   breathing, the default anywhere he's decoration
//   wave   one leaf-arm swings — greeting a new screen
//   cheer  both arms up with a hop — a milestone just landed
//   point  leans toward whatever sits to his right
//   think  a slow tilt, for a question being asked
//   sleep  eyes closed, for empty/quiet states

// One leaf, base at the origin, tip 23 to the right. Placed by translating
// to where it attaches and rotating outward, so the base tucks under
// whatever it grows from and reads as joined rather than floating.
const LEAF = "M0 0 C 5 -7, 17 -7, 23 0 C 17 7, 5 7, 0 0 Z";

export default function Mascot({ size = 56, className = "", action = "idle" }) {
  const asleep = action === "sleep";
  return (
    <svg
      className={"mascot-svg sprig " + className}
      data-action={action}
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
        {/* leaves sit a shade deeper than the body so arms and sprout read
            as separate shapes against it instead of melting into the head */}
        <linearGradient id="sprigLeaf" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3FA96F" />
          <stop offset="1" stopColor="#6FD196" />
        </linearGradient>
      </defs>

      {/* ground shadow — outside .sprig-body so a hop lifts him off it */}
      <ellipse className="sprig-shadow" cx="50" cy="94" rx="18" ry="3.5" fill="rgba(0,0,0,.12)" />

      {/* the whole plant, so a hop moves everything but the shadow */}
      <g className="sprig-body">
        {/* stem down into the ground */}
        <path d="M50 78 L50 92" stroke="#8B5A2B" strokeWidth="5" strokeLinecap="round" />

        {/* the sprout on top: a short stalk with a leaf either side. Drawn
            before the body so both bases tuck under the head. */}
        <g className="sprig-tuft">
          <path d="M50 34 L50 21" stroke="#3FA96F" strokeWidth="3" strokeLinecap="round" />
          <path d={LEAF} fill="url(#sprigLeaf)" transform="translate(50 21) rotate(-142) scale(.85)" />
          <path d={LEAF} fill="url(#sprigLeaf)" transform="translate(50 21) rotate(-38) scale(.85)" />
        </g>

        {/* leaf-arms, also drawn under the body so they look attached */}
        <g className="sprig-arm-l">
          <path d={LEAF} fill="url(#sprigLeaf)" transform="translate(26 62) rotate(172) scale(.8)" />
        </g>
        <g className="sprig-arm-r">
          <path d={LEAF} fill="url(#sprigLeaf)" transform="translate(74 62) rotate(8) scale(.8)" />
        </g>

        {/* head */}
        <circle cx="50" cy="55" r="29" fill="url(#sprigBody)" />
        <ellipse cx="40" cy="45" rx="7.5" ry="5" fill="rgba(255,255,255,.3)" />

        <g className="sprig-face">
          {asleep ? (
            <>
              <path d="M37 55 Q42 59 47 55" stroke="#264E3A" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M53 55 Q58 59 63 55" stroke="#264E3A" strokeWidth="3" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle className="sprig-eye" cx="42" cy="55" r="3.6" fill="#264E3A" />
              <circle className="sprig-eye" cx="58" cy="55" r="3.6" fill="#264E3A" />
            </>
          )}
          <path
            className="sprig-mouth"
            d={action === "cheer" ? "M42 62 Q50 73 58 62" : "M42 63 Q50 70 58 63"}
            stroke="#264E3A"
            strokeWidth="3.2"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="33" cy="61" r="3.6" fill="#FF9DBB" opacity=".6" />
          <circle cx="67" cy="61" r="3.6" fill="#FF9DBB" opacity=".6" />
        </g>
      </g>
    </svg>
  );
}
