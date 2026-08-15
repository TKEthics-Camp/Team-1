import { speciesOf, leafColorOf, LEAF_COLORS } from "../../lib/tree";
import { shade } from "../../lib/color";

// A hobby drawn as a tree. `stage` (0–4) sets how big it is; `health` sets how
// alive it looks; `species`/`leafColor` set what kind of tree it is and what
// shade its leaves are — chosen when planted, otherwise derived from the
// hobby's id so older trees still look consistent. The interest's own colour
// becomes the blossoms, so every tree is still recognisably "that hobby".
// Pure SVG — no photos, works offline.
const FOLIAGE = {
  wilting: ["#CFC24E", "#9C8C2C"],
  bare:    ["#C0A268", "#8C6E38"],
  dead:    ["#8E8478", "#6B6055"],
};
const TRUNK = { healthy: "#8B5A2B", wilting: "#8B5A2B", bare: "#7A4E28", dead: "#6E655C" };

// per stage: trunk height, trunk width, canopy radius. Spread wide on
// purpose — a stage-1 sapling should read as visibly small next to a
// stage-4 tree, not just a scaled-down copy of it (see also `lobes` below,
// which changes canopy *shape* by stage, not just size).
const GEO = [
  { th: 8,  tw: 4,   r: 0  },  // 0 seed / sprout (special-cased)
  { th: 10, tw: 3.2, r: 7  },  // 1 young sapling — deliberately tiny and spindly
  { th: 19, tw: 5,   r: 14 },  // 2
  { th: 31, tw: 7.2, r: 22 },  // 3
  { th: 48, tw: 10,  r: 32 },  // 4 full — a clear step up from stage 3, not just a scaled copy
];
// How much of the ground footprint a tree casts at each stage — a small
// sapling shouldn't sit on the same huge shadow as a full tree.
const GROUND_SCALE = [0.42, 0.54, 0.72, 0.9, 1.08];
// How many "layers" of canopy detail show at each stage. Stage 4 goes one
// tier past what stage 3 unlocks (see the `lobes >= 4` checks below) so a
// full tree is visibly bushier than a young one, not just a bigger version
// of the exact same silhouette.
const LOBES = [0, 1, 2, 3, 5];

// A tidy scatter of blossoms, spread evenly across the canopy by area (not a
// fixed handful of hardcoded spots), so any count from 1 to a busy cherry's
// worth still looks natural.
function fruitSpots(n, r) {
  const GOLDEN = (137.50776 * Math.PI) / 180;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i * GOLDEN;
    const d = r * 0.72 * Math.sqrt((i + 0.5) / n);
    pts.push([Math.cos(a) * d, Math.sin(a) * d * 0.82]);
  }
  return pts;
}

// A canopy made of one or two smooth shapes reads flat and simple ("just
// three circles"). This scatters a dozen small puffs of foliage over the
// base silhouette — alternating lighter/darker than the base gradient — so
// the canopy reads as a mass of individual clumps of leaves, not one blob.
// Deterministic (golden-angle spacing), so it's stable across re-renders.
function leafPuffs(r, count = 12) {
  const GOLDEN = (137.50776 * Math.PI) / 180;
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = i * GOLDEN + 0.6;
    const d = r * 0.68 * Math.sqrt((i + 0.4) / count);
    const pr = r * (0.15 + 0.11 * ((i * 53) % 7) / 6);
    pts.push([Math.cos(a) * d, Math.sin(a) * d * 0.88, pr]);
  }
  return pts;
}

export default function Tree({ interest, size, stage = 4, health = "healthy", species = null, leafColor = null, className = "" }) {
  const color = interest?.color || "#6EE7A8";
  const kind = species || interest?.species || speciesOf(interest);
  const leafKey = leafColor || interest?.leafColor || leafColorOf(interest);
  const [fLite, fDark] = health === "healthy" ? (LEAF_COLORS[leafKey] || LEAF_COLORS.green) : FOLIAGE[health] || FOLIAGE.wilting;
  const birchBark = health !== "dead" && kind === "birch";
  const trunk = birchBark ? "#E8E0D0" : TRUNK[health] || TRUNK.healthy;
  const dead = health === "dead";
  const bare = health === "bare";
  const showLeaves = !dead;
  const groundY = 90;
  const g = GEO[stage] || GEO[4];
  const uid = `t${stage}${health}${kind}${leafKey}${String(color).replace("#", "")}`;
  const fillUrl = `url(#${uid})`;

  // blossoms (the hobby colour) only on a lively tree — cherry wears a lot
  // more of them. Weighted toward the top stages, not a straight line, so a
  // full tree visibly bursts with them next to a young tree's bare few.
  const healthyN = kind === "cherry" ? [0, 3, 9, 17, 28][stage] : [0, 0, 1, 3, 6][stage];
  const wiltN = kind === "cherry" ? [0, 2, 4, 7, 10][stage] : [0, 0, 1, 1, 2][stage];
  const fruitN = health === "healthy" ? healthyN : health === "wilting" ? wiltN : 0;

  const canopyY = groundY - g.th - g.r * 0.55;
  const noStandardCanopy = kind === "bamboo" || kind === "palm";
  const lobes = LOBES[stage] || 1;
  const groundScale = GROUND_SCALE[stage] || 1;

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
        <linearGradient id={`b${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={shade(trunk, 26)} />
          <stop offset="1" stopColor={trunk} />
        </linearGradient>
      </defs>

      {/* ground — footprint grows with the tree, so a sapling doesn't sit on a full tree's shadow */}
      <ellipse cx="50" cy={groundY + 3} rx={30 * groundScale} ry={6 * groundScale} fill="rgba(0,0,0,.12)" />
      <ellipse cx="50" cy={groundY + 2} rx={26 * groundScale} ry={5 * groundScale} fill="rgba(120,90,50,.28)" />

      {stage === 0 ? (
        // a sprout: short stem + two little leaves (same for every species —
        // nothing's grown enough yet to tell them apart)
        <g>
          <path d={`M50 ${groundY} Q49 ${groundY - 10} 50 ${groundY - 16}`} stroke={dead ? trunk : "#3E9E5E"} strokeWidth="3" fill="none" strokeLinecap="round" />
          {showLeaves && (
            <>
              <ellipse cx="43" cy={groundY - 13} rx="8" ry="5" fill={fillUrl} transform={`rotate(-28 43 ${groundY - 13})`} />
              <ellipse cx="57" cy={groundY - 16} rx="8" ry="5" fill={fillUrl} transform={`rotate(28 57 ${groundY - 16})`} />
            </>
          )}
        </g>
      ) : kind === "bamboo" ? (
        // a clump of canes, each with its own little tuft — no single trunk
        <g opacity={dead ? 0.7 : 1}>
          {[{ x: -0.42, hf: 0.8 }, { x: 0, hf: 1 }, { x: 0.4, hf: 0.65 }].map((c, i) => {
            const caneH = (g.th * 1.15 + g.r * 0.55) * c.hf;
            const caneX = 50 + c.x * g.r * 0.85;
            const caneColor = dead ? trunk : fDark;
            const caneW = Math.max(2, g.tw * 0.4);
            return (
              <g key={i}>
                <rect x={caneX - caneW / 2} y={groundY - caneH} width={caneW} height={caneH} rx={caneW / 2} fill={caneColor} />
                {[0.18, 0.42, 0.66].map((seg) => (
                  <rect key={seg} x={caneX - caneW / 2 - 0.6} y={groundY - caneH + caneH * seg} width={caneW + 1.2} height="1.4" fill={shade(caneColor, -20)} opacity=".6" />
                ))}
                {showLeaves && [0, 1].map((j) => {
                  const ty = groundY - caneH + g.r * (0.15 + j * 0.32);
                  return (
                    <g key={j} opacity={bare ? 0.55 : 1}>
                      <path d={`M${caneX} ${ty} q${-g.r * 0.55} ${-g.r * 0.14} ${-g.r * 0.85} ${g.r * 0.04}`} stroke={fillUrl} strokeWidth={Math.max(1.4, g.r * 0.1)} fill="none" strokeLinecap="round" />
                      <path d={`M${caneX} ${ty} q${g.r * 0.55} ${-g.r * 0.14} ${g.r * 0.85} ${g.r * 0.04}`} stroke={fillUrl} strokeWidth={Math.max(1.4, g.r * 0.1)} fill="none" strokeLinecap="round" />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
      ) : (
        <g>
          {/* trunk */}
          <rect x={50 - g.tw / 2} y={groundY - g.th} width={g.tw} height={g.th} rx={g.tw / 2} fill={`url(#b${uid})`} />
          {birchBark && (
            // birch bark: a couple of dark horizontal flecks
            <>
              <rect x={50 - g.tw / 2} y={groundY - g.th * 0.7} width={g.tw} height={g.tw * 0.35} fill="#8C8478" opacity=".7" />
              <rect x={50 - g.tw / 2} y={groundY - g.th * 0.35} width={g.tw * 0.6} height={g.tw * 0.3} fill="#8C8478" opacity=".7" />
            </>
          )}
          {/* a couple of branches show through on bare/dead trees */}
          {(bare || dead) && !noStandardCanopy && (
            <>
              <path d={`M50 ${groundY - g.th * 0.7} L${50 - g.r * 0.5} ${groundY - g.th - g.r * 0.4}`} stroke={trunk} strokeWidth="2.4" strokeLinecap="round" />
              <path d={`M50 ${groundY - g.th * 0.55} L${50 + g.r * 0.55} ${groundY - g.th - g.r * 0.3}`} stroke={trunk} strokeWidth="2.4" strokeLinecap="round" />
            </>
          )}

          {kind === "palm" ? (
            showLeaves && (
              <g opacity={bare ? 0.55 : 1}>
                {[-70, -40, -14, 14, 40, 70].map((deg, i) => {
                  const rad = (deg * Math.PI) / 180;
                  const len = g.r * 1.2;
                  const crownX = 50, crownY = groundY - g.th - g.r * 0.1;
                  const midX = crownX + Math.sin(rad) * len * 0.55;
                  const midY = crownY - Math.cos(rad) * len * 0.55;
                  const tipX = crownX + Math.sin(rad) * len;
                  const tipY = crownY - Math.cos(rad) * len * 0.4 + g.r * 0.45;
                  return (
                    <path
                      key={i}
                      d={`M${crownX} ${crownY} Q${midX} ${midY} ${tipX} ${tipY}`}
                      stroke={fillUrl} strokeWidth={Math.max(2, g.r * 0.16)} fill="none" strokeLinecap="round"
                    />
                  );
                })}
                <circle cx="50" cy={groundY - g.th - g.r * 0.1} r={g.r * 0.16} fill={fDark} />
                {fruitN > 0 && fruitSpots(Math.min(fruitN, 4), g.r * 0.5).map(([dx, dy], i) => (
                  <circle key={i} cx={50 + dx} cy={groundY - g.th + g.r * 0.15 + dy} r={g.r * 0.11} fill={color} stroke="rgba(255,255,255,.5)" strokeWidth="0.6" />
                ))}
              </g>
            )
          ) : (
            /* canopy — shape depends on species, blossoms always in the hobby colour */
            showLeaves && (
              <g opacity={bare ? 0.55 : 1}>
                {kind === "pine" ? (
                  <>
                    <polygon points={`50,${canopyY - g.r * 0.95} ${50 - g.r * 0.5},${canopyY - g.r * 0.1} ${50 + g.r * 0.5},${canopyY - g.r * 0.1}`} fill={fillUrl} />
                    {lobes >= 2 && (
                      <polygon points={`50,${canopyY - g.r * 0.4} ${50 - g.r * 0.72},${canopyY + g.r * 0.35} ${50 + g.r * 0.72},${canopyY + g.r * 0.35}`} fill={fillUrl} />
                    )}
                    {lobes >= 3 && (
                      <polygon points={`50,${canopyY + g.r * 0.1} ${50 - g.r * 0.92},${canopyY + g.r * 0.8} ${50 + g.r * 0.92},${canopyY + g.r * 0.8}`} fill={fillUrl} />
                    )}
                    {lobes >= 4 && (
                      <polygon points={`50,${canopyY + g.r * 0.35} ${50 - g.r * 1.1},${canopyY + g.r * 1.15} ${50 + g.r * 1.1},${canopyY + g.r * 1.15}`} fill={fillUrl} />
                    )}
                  </>
                ) : kind === "cypress" ? (
                  // a tall, narrow flame — a slow taper to a soft point
                  <path
                    d={`M50 ${canopyY - g.r * 1.15}
                        C ${50 + g.r * 0.4} ${canopyY - g.r * 0.7} ${50 + g.r * 0.46} ${canopyY + g.r * 0.35} ${50 + g.r * 0.3} ${canopyY + g.r * 0.95}
                        Q 50 ${canopyY + g.r * 1.12} ${50 - g.r * 0.3} ${canopyY + g.r * 0.95}
                        C ${50 - g.r * 0.46} ${canopyY + g.r * 0.35} ${50 - g.r * 0.4} ${canopyY - g.r * 0.7} 50 ${canopyY - g.r * 1.15} Z`}
                    fill={fillUrl}
                  />
                ) : kind === "willow" ? (
                  // a dome up top, then a curtain of overlapping drips — more
                  // of them, and more overlap, as the tree matures
                  <>
                    {Array.from({ length: 3 + lobes * 2 }).map((_, i, arr) => {
                      const f = (i / (arr.length - 1) - 0.5) * 2;
                      const x = 50 + f * g.r * 0.82;
                      const len = g.r * (1.35 - Math.abs(f) * 0.4);
                      return <ellipse key={i} cx={x} cy={canopyY + g.r * 0.25 + len * 0.5} rx={g.r * 0.26} ry={len * 0.5} fill={fillUrl} />;
                    })}
                    <ellipse cx="50" cy={canopyY} rx={g.r * 1.02} ry={g.r * 0.62} fill={fillUrl} />
                  </>
                ) : kind === "birch" ? (
                  <>
                    <ellipse cx="50" cy={canopyY - g.r * 0.1} rx={g.r * (0.6 + lobes * 0.03)} ry={g.r * 1.05} fill={fillUrl} />
                    {lobes >= 4 && <ellipse cx="50" cy={canopyY + g.r * 0.2} rx={g.r * 0.42} ry={g.r * 0.68} fill={fillUrl} />}
                  </>
                ) : kind === "maple" ? (
                  // wide and layered — a fuller, flatter crown than oak's,
                  // one lobe at a time as the tree matures
                  <>
                    <circle cx="50" cy={canopyY - g.r * 0.12} r={g.r * 0.88} fill={fillUrl} />
                    {lobes >= 2 && (
                      <>
                        <circle cx={50 - g.r * 0.68} cy={canopyY + g.r * 0.28} r={g.r * 0.64} fill={fillUrl} />
                        <circle cx={50 + g.r * 0.68} cy={canopyY + g.r * 0.28} r={g.r * 0.64} fill={fillUrl} />
                      </>
                    )}
                    {lobes >= 3 && <circle cx="50" cy={canopyY + g.r * 0.38} r={g.r * 0.7} fill={fillUrl} />}
                    {lobes >= 4 && (
                      <>
                        <circle cx={50 - g.r * 0.3} cy={canopyY - g.r * 0.55} r={g.r * 0.52} fill={fillUrl} />
                        <circle cx={50 + g.r * 0.3} cy={canopyY - g.r * 0.55} r={g.r * 0.52} fill={fillUrl} />
                      </>
                    )}
                  </>
                ) : (
                  // oak (and cherry, same silhouette): a full, lumpy round canopy
                  // built from five overlapping lobes, added one tier at a time
                  <>
                    <circle cx="50" cy={canopyY} r={g.r} fill={fillUrl} />
                    {lobes >= 2 && (
                      <>
                        <circle cx={50 - g.r * 0.45} cy={canopyY + g.r * 0.3} r={g.r * 0.78} fill={fillUrl} />
                        <circle cx={50 + g.r * 0.5} cy={canopyY + g.r * 0.34} r={g.r * 0.74} fill={fillUrl} />
                      </>
                    )}
                    {lobes >= 3 && (
                      <>
                        <circle cx={50 - g.r * 0.15} cy={canopyY - g.r * 0.42} r={g.r * 0.6} fill={fillUrl} />
                        <circle cx={50 + g.r * 0.4} cy={canopyY - g.r * 0.28} r={g.r * 0.56} fill={fillUrl} />
                      </>
                    )}
                    {lobes >= 4 && (
                      <>
                        <circle cx={50 - g.r * 0.72} cy={canopyY} r={g.r * 0.5} fill={fillUrl} />
                        <circle cx={50 + g.r * 0.78} cy={canopyY - g.r * 0.05} r={g.r * 0.48} fill={fillUrl} />
                        <circle cx="50" cy={canopyY + g.r * 0.6} r={g.r * 0.58} fill={fillUrl} />
                      </>
                    )}
                  </>
                )}
                {/* individual leaf clumps break up the base shape's flat fill — more of them as the tree fills out */}
                {["oak", "maple", "cherry", "pine", "cypress", "birch"].includes(kind) &&
                  leafPuffs(g.r, 3 + lobes * 3).map(([dx, dy, pr], i) => (
                    <circle
                      key={"puff" + i}
                      cx={50 + dx}
                      cy={canopyY + dy}
                      r={pr}
                      fill={i % 2 === 0 ? shade(fDark, -8) : shade(fLite, 10)}
                      opacity=".5"
                    />
                  ))}
                {/* a soft gloss, the same touch the orbs get, so the canopy reads as more than a flat blob */}
                <ellipse cx={50 - g.r * 0.28} cy={canopyY - g.r * 0.34} rx={g.r * 0.3} ry={g.r * 0.2} fill="rgba(255,255,255,.25)" />
                {fruitSpots(fruitN, g.r).map(([dx, dy], i) => (
                  <circle key={i} cx={50 + dx} cy={canopyY + dy} r={g.r * 0.11} fill={color} stroke="rgba(255,255,255,.5)" strokeWidth="0.6" />
                ))}
              </g>
            )
          )}

          {dead && !noStandardCanopy && (
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
