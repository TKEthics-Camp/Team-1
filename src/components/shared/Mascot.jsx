// Twig — the app's mascot. A simple round sprout on a stem, drawn entirely
// in currentColor (no gradients, no fixed palette) so it reads correctly in
// every theme — White, Black, or System — without separate light/dark
// assets. Used anywhere the app "talks" to the user directly: the guided
// tour, empty states, year in review, and onboarding.
export default function Mascot({ size = 56, className = "" }) {
  return (
    <svg
      className={"mascot-svg " + className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
    >
      {/* stem, planted */}
      <line x1="50" y1="68" x2="50" y2="92" strokeWidth="5" />

      {/* head */}
      <circle cx="50" cy="41" r="27" strokeWidth="5" />

      {/* face */}
      <circle cx="40.5" cy="41" r="3.2" fill="currentColor" stroke="none" />
      <circle cx="59.5" cy="41" r="3.2" fill="currentColor" stroke="none" />
      <path d="M39 50 Q50 57 61 50" strokeWidth="3.4" />
    </svg>
  );
}
