// A hobby drawn as a tree. `stage` (0–4) sets how big it is; `health` sets how
// alive it looks. The interest's colour becomes the blossoms, so every tree is
// still recognisably "that hobby". Pure SVG — no photos, works offline.
const FOLIAGE = {
  healthy: ["#63C489", "#2E9E63"],
  wilting: ["#CFC24E", "#9C8C2C"],
  bare:    ["#C0A268", "#8C6E38"],
  dead:    ["#8E8478", "#6B6055"],
};
const TRUNK = { healthy: "#8B5A2B", wilting: "#8B5A2B", bare: "#7A4E28", dead: "#6E655C" };

// per stage: trunk height, trunk width, canopy radius
const GEO = [
  { th: 8,  tw: 4, r: 0 },   // 0 seed / sprout (special-cased)
  { th: 16, tw: 5, r: 13 },  // 1 sapling-ish
  { th: 24, tw: 6, r: 17 },  // 2
  { th: 32, tw: 7, r: 21 },  // 3
  { th: 40, tw: 8, r: 24 },  // 4 full
];

export default function Tree({ interest, size, stage = 4, health = "healthy", className = "" }) {
  const color = interest?.color || "#6EE7A8";
  const [fLite, fDark] = FOLIAGE[health] || FOLIAGE.healthy;
  const trunk = TRUNK[health] || TRUNK.healthy;
  const dead = health === "dead";
  const bare = health === "bare";
  const showLeaves = !dead;
  const groundY = 90;
  const g = GEO[stage] || GEO[4];
  const uid = `t${stage}${health}${String(color).replace("#", "")}`;

  // blossoms (the hobby colour) only on a lively tree
  const fruitN = health === "healthy" ? [0, 1, 2, 3, 4][stage] : health === "wilting" ? [0, 0, 1, 1, 2][stage] : 0;
  const fruitPos = [[42, 40], [60, 46], [50, 30], [66, 34], [38, 30]];

  const canopyY = groundY - g.th - g.r * 0.55;

  return (
    <svg
      className={"tree-svg " + className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={uid} cx="38%" cy="32%" r="72%">
          <stop offset="0" stopColor={fLite} />
          <stop offset="1" stopColor={fDark} />
        </radialGradient>
      </defs>

      {/* ground */}
      <ellipse cx="50" cy={groundY + 3} rx="30" ry="6" fill="rgba(0,0,0,.12)" />
      <ellipse cx="50" cy={groundY + 2} rx="26" ry="5" fill="rgba(120,90,50,.28)" />

      {stage === 0 ? (
        // a sprout: short stem + two little leaves
        <g>
          <path d={`M50 ${groundY} Q49 ${groundY - 10} 50 ${groundY - 16}`} stroke={dead ? trunk : "#3E9E5E"} strokeWidth="3" fill="none" strokeLinecap="round" />
          {showLeaves && (
            <>
              <ellipse cx="43" cy={groundY - 13} rx="8" ry="5" fill={`url(#${uid})`} transform={`rotate(-28 43 ${groundY - 13})`} />
              <ellipse cx="57" cy={groundY - 16} rx="8" ry="5" fill={`url(#${uid})`} transform={`rotate(28 57 ${groundY - 16})`} />
            </>
          )}
        </g>
      ) : (
        <g>
          {/* trunk */}
          <rect x={50 - g.tw / 2} y={groundY - g.th} width={g.tw} height={g.th} rx={g.tw / 2} fill={trunk} />
          {/* a couple of branches show through on bare/dead trees */}
          {(bare || dead) && (
            <>
              <path d={`M50 ${groundY - g.th * 0.7} L${50 - g.r * 0.5} ${groundY - g.th - g.r * 0.4}`} stroke={trunk} strokeWidth="2.4" strokeLinecap="round" />
              <path d={`M50 ${groundY - g.th * 0.55} L${50 + g.r * 0.55} ${groundY - g.th - g.r * 0.3}`} stroke={trunk} strokeWidth="2.4" strokeLinecap="round" />
            </>
          )}
          {/* canopy */}
          {showLeaves && (
            <g opacity={bare ? 0.55 : 1}>
              <circle cx={50 - g.r * 0.45} cy={canopyY + g.r * 0.3} r={g.r * 0.78} fill={`url(#${uid})`} />
              <circle cx={50 + g.r * 0.5} cy={canopyY + g.r * 0.34} r={g.r * 0.74} fill={`url(#${uid})`} />
              <circle cx="50" cy={canopyY} r={g.r} fill={`url(#${uid})`} />
              {/* blossoms in the hobby colour */}
              {Array.from({ length: fruitN }).map((_, i) => {
                const [fx, fy] = fruitPos[i % fruitPos.length];
                const px = 50 + (fx - 50) * (g.r / 24);
                const py = canopyY + (fy - 36) * (g.r / 24);
                return <circle key={i} cx={px} cy={py} r={g.r * 0.11} fill={color} stroke="rgba(255,255,255,.5)" strokeWidth="0.6" />;
              })}
            </g>
          )}
          {dead && (
            // a bare dead crown: a few crossed twigs
            <g stroke={trunk} strokeWidth="2" strokeLinecap="round" opacity="0.85">
              <path d={`M50 ${groundY - g.th} L${50 - g.r * 0.6} ${canopyY}`} fill="none" />
              <path d={`M50 ${groundY - g.th} L${50 + g.r * 0.55} ${canopyY + 2}`} fill="none" />
              <path d={`M50 ${groundY - g.th} L50 ${canopyY - g.r * 0.3}`} fill="none" />
            </g>
          )}
        </g>
      )}
    </svg>
  );
}
