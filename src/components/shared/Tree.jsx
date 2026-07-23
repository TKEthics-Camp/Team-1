import { speciesOf } from "../../lib/species";

// A hobby drawn as a tree. `stage` (0–4) sets how big it is; `health` sets how
// alive it looks; `interest.species` (see lib/species.js) sets what kind of
// tree it is — leaf shape, canopy silhouette, bark, and its healthy colour.
// Pure SVG — no photos, works offline. The canopy is built from many
// individual leaf shapes (not a soft blob) so it reads as real foliage.
//
// A neglected tree browns and dries out the same way regardless of species —
// only a *healthy* tree shows its species' own colour — so wilting/bare/dead
// share one universal decaying palette instead of every species needing its
// own withered variant.
const DECAY = {
  wilting: ["#E6DB79", "#C9BA46", "#8C7A24"],
  bare:    ["#D8C08A", "#B99B5E", "#8C6E38"],
  dead:    ["#A79E90", "#8E8478", "#6B6055"],
};
const TRUNK = { healthy: "#8B5A2B", wilting: "#8B5A2B", bare: "#7A4E28", dead: "#6E655C" };
const BIRCH_TRUNK = { healthy: "#E8E2D6", wilting: "#DDD3BE", bare: "#C9BFAA", dead: "#B0A896" };
const BARK_MARK = "#4A4238";

// GROWTH RULES — see lib/tree.js for the stage-by-activity-count rule this
// is indexed by. GEO: per stage, trunk height/width and canopy radius, all
// growing together; LEAF_COUNT: how many individual leaves fill the canopy.
const GEO = [
  { th: 8,  tw: 4, r: 0 },   // 0 seed / sprout (special-cased)
  { th: 16, tw: 5, r: 13 },  // 1 sapling-ish
  { th: 24, tw: 6, r: 17 },  // 2
  { th: 32, tw: 7, r: 21 },  // 3
  { th: 40, tw: 8, r: 24 },  // 4 full
];
const LEAF_COUNT = [0, 14, 22, 32, 44];
const FROND_COUNT = [0, 4, 6, 7, 9];
const STALK_COUNT = [0, 3, 4, 5, 6];
const STALK_OFFSETS = [-9, -4, 2, 7, -2, 5, -7];

// ---------- colour blending, for a soft continuous gradient across the
// canopy instead of a few flat bands ----------
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * Math.max(0, Math.min(1, t))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
// A soft light-from-upper-left feel blended with canopy depth (leaves buried
// toward the middle shade a bit regardless of facing) — continuous, not
// three hard steps, so many small leaves read as one dimensional surface.
const LIGHT = { x: -0.5, y: -0.82 };
function shadeOf(dx, dy, rFrac, fLite, fMid, fDark) {
  const len = Math.hypot(dx, dy) || 1;
  const facing = (dx / len) * LIGHT.x + (dy / len) * LIGHT.y; // -1..1
  const t = Math.max(0, Math.min(1, 0.5 - 0.32 * facing + 0.34 * rFrac));
  return t < 0.5 ? mix(fLite, fMid, t * 2) : mix(fMid, fDark, (t - 0.5) * 2);
}

// ---------- leaf shapes, all drawn at the origin so a single translate+
// rotate places and orients them ----------
function ovalPath(w, h) {
  const hw = w / 2, hh = h / 2;
  return `M0,${-hh} Q${hw},0 0,${hh} Q${-hw},0 0,${-hh} Z`;
}
function needlePath(w, h) {
  const hw = w * 0.22;
  return `M0,${-h / 2} L${hw},${h / 2} L${-hw},${h / 2} Z`;
}
// A rounded, shallow-lobed silhouette — a simplified stand-in for a maple leaf.
function maplePath(w, h) {
  const hw = w / 2, hh = h / 2;
  return `M0,${-hh} Q${hw * 0.9},${-hh * 0.3} ${hw},${hh * 0.05}
          Q${hw * 0.5},${hh * 0.1} ${hw * 0.6},${hh * 0.55}
          Q${hw * 0.15},${hh * 0.3} 0,${hh}
          Q${-hw * 0.15},${hh * 0.3} ${-hw * 0.6},${hh * 0.55}
          Q${-hw * 0.5},${hh * 0.1} ${-hw},${hh * 0.05}
          Q${-hw * 0.9},${-hh * 0.3} 0,${-hh} Z`;
}
function leafPath(kind, w, h) {
  if (kind === "needle") return needlePath(w, h);
  if (kind === "maple") return maplePath(w, h);
  if (kind === "blossom") { const d = Math.max(w, h) * 0.9; return ovalPath(d, d); }
  if (kind === "willow") return ovalPath(w * 0.55, h * 1.3);
  return ovalPath(w, h);
}
// A curved blade pointing straight up by default, for palm fronds — rotate
// around its base to fan it out to either side (and past horizontal, to droop).
function frondPath(len, width) {
  const w = width / 2;
  return `M0,0 Q${w * 0.9},${-len * 0.55} ${w * 0.15},${-len} Q${-w * 0.6},${-len * 0.6} 0,0 Z`;
}

// ---------- canopy silhouettes ----------
// Sunflower/golden-angle spiral: a deterministic, evenly-packed scatter of N
// points inside a circle of radius R — no two leaves land in the same spot,
// and it's stable across re-renders (unlike Math.random would be).
const GOLDEN_ANGLE = 137.50776;
function spotRound(i, n, R) {
  const a = (i * GOLDEN_ANGLE * Math.PI) / 180;
  const r = R * Math.sqrt((i + 0.5) / n);
  return { dx: r * Math.cos(a), dy: r * Math.sin(a), angleDeg: (i * GOLDEN_ANGLE) % 360 };
}
// Pine/cypress: a spiral cone — height grows monotonically with i while the
// azimuth sweeps around several times and the ring radius widens toward the
// base, giving a triangular silhouette instead of a round crown. Cypress uses
// the same generator with a much smaller R (via species.radiusScale) for its
// tight, narrow spire.
function spotConical(i, n, R) {
  const t = (i + 0.5) / n; // 0 at the apex .. 1 at the base
  const dy = -R + t * R * 1.7;
  const ringR = R * t * 0.9;
  const angle = ((i * GOLDEN_ANGLE * 2.4) * Math.PI) / 180;
  return { dx: ringR * Math.cos(angle), dy, angleDeg: ((angle * 180) / Math.PI) % 360 };
}
// Willow: a smaller round crown on top, plus a handful of strands hanging
// straight down from its lower rim — the "weeping" silhouette.
function spotWeeping(i, n, R) {
  const crownN = Math.max(1, Math.round(n * 0.65));
  if (i < crownN) return spotRound(i, crownN, R * 0.85);
  const strandIdx = i - crownN;
  const strandCount = Math.max(1, n - crownN);
  const strandsTotal = 6;
  const strand = strandIdx % strandsTotal;
  const along = Math.floor(strandIdx / strandsTotal);
  const perStrand = Math.max(1, Math.ceil(strandCount / strandsTotal));
  const angle = (strand / strandsTotal) * Math.PI * 2 + 0.4;
  const anchorR = R * 0.8;
  const t = perStrand > 1 ? along / (perStrand - 1) : 0;
  return {
    dx: Math.cos(angle) * anchorR * (1 - t * 0.25),
    dy: R * 0.35 + t * R * 1.1,
    angleDeg: 90, // hangs straight down
  };
}
function leafSpot(canopy, i, n, R) {
  if (canopy === "conical") return spotConical(i, n, R);
  if (canopy === "weeping") return spotWeeping(i, n, R);
  return spotRound(i, n, R);
}

export default function Tree({ interest, size, stage = 4, health = "healthy", className = "" }) {
  const color = interest?.color || "#6EE7A8";
  const species = speciesOf(interest?.species);
  const [fLite, fMid, fDark] = health === "healthy" ? species.healthy : DECAY[health] || DECAY.wilting;
  const trunk = (species.bark === "banded" ? BIRCH_TRUNK : TRUNK)[health] || TRUNK.healthy;
  const dead = health === "dead";
  const bare = health === "bare";
  const showLeaves = !dead;
  const windy = !dead; // dead trees are still; everything alive moves a little
  const groundY = 90;
  const g = GEO[stage] || GEO[4];

  // blossoms (the hobby colour) only on a lively tree
  const fruitN = health === "healthy" ? [0, 1, 2, 3, 4][stage] : health === "wilting" ? [0, 0, 1, 1, 2][stage] : 0;
  const fruitPos = [[42, 40], [60, 46], [50, 30], [66, 34], [38, 30]];

  const canopyY = groundY - g.th - g.r * 0.55;
  const leafN = showLeaves ? (LEAF_COUNT[stage] || 0) : 0;
  const leafR = g.r * 0.92 * (species.radiusScale ?? 1); // keep leaves just inside the canopy silhouette
  const scale = g.r / 24;
  const strokeCol = health === "healthy" ? "#1E5A2A" : health === "wilting" ? "#6B5A10" : "#5C4620";

  const swayProps = windy ? { transformOrigin: `50px ${groundY}px` } : undefined;
  const swayClass = windy ? "tree-sway" : "";

  return (
    <svg
      className={"tree-svg " + className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* ground */}
      <ellipse cx="50" cy={groundY + 3} rx="30" ry="6" fill="rgba(0,0,0,.12)" />
      <ellipse cx="50" cy={groundY + 2} rx="26" ry="5" fill="rgba(120,90,50,.28)" />

      {stage === 0 ? (
        // a sprout: short stem + two little leaves (same for every species —
        // a just-planted seed doesn't show its character yet)
        <g>
          <path d={`M50 ${groundY} Q49 ${groundY - 10} 50 ${groundY - 16}`} stroke={dead ? trunk : "#3E9E5E"} strokeWidth="3" fill="none" strokeLinecap="round" />
          {showLeaves && (
            <>
              <g className={windy ? "leaf-sway" : ""} style={windy ? { transformOrigin: `43px ${groundY - 13}px`, animationDelay: "0s" } : undefined}>
                <path d={leafPath(species.leaf, 9, 13)} transform={`translate(43 ${groundY - 13}) rotate(-28)`} fill={fLite} stroke={strokeCol} strokeOpacity="0.3" strokeWidth="0.5" />
              </g>
              <g className={windy ? "leaf-sway" : ""} style={windy ? { transformOrigin: `57px ${groundY - 16}px`, animationDelay: "0.4s" } : undefined}>
                <path d={leafPath(species.leaf, 9, 13)} transform={`translate(57 ${groundY - 16}) rotate(28)`} fill={fMid} stroke={strokeCol} strokeOpacity="0.3" strokeWidth="0.5" />
              </g>
            </>
          )}
        </g>
      ) : species.form === "palm" ? (
        <g className={swayClass} style={swayProps}>
          {/* a tall, slightly leaning trunk */}
          <path
            d={`M${50 - g.tw * 0.4} ${groundY} Q${50 - g.tw * 0.32} ${groundY - g.th * 0.6} ${50 + g.tw * 0.15} ${groundY - g.th * 1.25}
                L${50 + g.tw * 0.55} ${groundY - g.th * 1.22} Q${50 + g.tw * 0.4} ${groundY - g.th * 0.6} ${50 + g.tw * 0.5} ${groundY} Z`}
            fill={trunk}
          />
          {species.bark === "tall" && (
            <g stroke={BARK_MARK} strokeWidth="0.7" opacity="0.35">
              <path d={`M${50 - g.tw * 0.3} ${groundY - g.th * 0.9} Q${50 - g.tw * 0.15} ${groundY - g.th * 0.88} ${50} ${groundY - g.th * 0.9}`} fill="none" />
              <path d={`M${50 - g.tw * 0.15} ${groundY - g.th * 0.55} Q${50} ${groundY - g.th * 0.53} ${50 + g.tw * 0.15} ${groundY - g.th * 0.55}`} fill="none" />
            </g>
          )}
          {showLeaves && (() => {
            const frondN = FROND_COUNT[stage] || 0;
            const crownX = 50 + g.tw * 0.15, crownY = groundY - g.th * 1.25;
            return (
              <g opacity={bare ? 0.6 : 1}>
                {Array.from({ length: frondN }).map((_, i) => {
                  const angle = frondN > 1 ? -100 + i * (200 / (frondN - 1)) : 0;
                  const len = g.r * (1.05 + ((i * 41) % 20) / 100);
                  const width = g.r * 0.34;
                  const edge = Math.abs(angle) / 100; // 0=top centre, 1=drooping side fronds
                  const fill = mix(fDark, fLite, 1 - edge);
                  return (
                    <g
                      key={i}
                      className="leaf-sway"
                      style={{
                        transformOrigin: `${crownX}px ${crownY}px`,
                        animationDelay: `${(i % 6) * 0.25}s`,
                        animationDuration: `${2.2 + (i % 5) * 0.3}s`,
                      }}
                    >
                      <path
                        d={frondPath(len, width)}
                        transform={`translate(${crownX} ${crownY}) rotate(${angle})`}
                        fill={fill}
                        stroke={strokeCol}
                        strokeOpacity="0.3"
                        strokeWidth={0.5 * scale}
                      />
                    </g>
                  );
                })}
              </g>
            );
          })()}
          {dead && (
            <g stroke={trunk} strokeWidth="2" strokeLinecap="round" opacity="0.85">
              <path d={`M${50 + g.tw * 0.15} ${groundY - g.th * 1.25} L${50 - g.r * 0.4} ${groundY - g.th * 1.1}`} fill="none" />
              <path d={`M${50 + g.tw * 0.15} ${groundY - g.th * 1.25} L${50 + g.r * 0.45} ${groundY - g.th * 1.15}`} fill="none" />
            </g>
          )}
        </g>
      ) : species.form === "bamboo" ? (
        <g className={swayClass} style={swayProps}>
          {(() => {
            const stalkN = STALK_COUNT[stage] || 0;
            return Array.from({ length: stalkN }).map((_, i) => {
              const dx = STALK_OFFSETS[i % STALK_OFFSETS.length] * scale;
              const hFactor = 0.75 + ((i * 37) % 30) / 100;
              const stalkH = (g.th + g.r * 0.95) * hFactor;
              const topY = groundY - stalkH;
              const stalkX = 50 + dx;
              const nodeCount = 4;
              return (
                <g key={i}>
                  <rect x={stalkX - 1.1 * scale} y={topY} width={2.2 * scale} height={stalkH} rx={1 * scale} fill={fMid} />
                  {dead && <rect x={stalkX - 1.1 * scale} y={topY} width={2.2 * scale} height={stalkH} rx={1 * scale} fill={fDark} opacity="0.5" />}
                  {Array.from({ length: nodeCount }).map((_, ni) => (
                    <rect key={ni} x={stalkX - 1.3 * scale} y={topY + ((ni + 1) * stalkH) / (nodeCount + 1)} width={2.6 * scale} height={0.8 * scale} fill={fDark} opacity="0.5" />
                  ))}
                  {showLeaves && [-1, 1].map((side) => (
                    <g
                      key={side}
                      className="leaf-sway"
                      style={{
                        transformOrigin: `${stalkX}px ${topY + stalkH * 0.18}px`,
                        animationDelay: `${((i + side) % 6) * 0.25}s`,
                        animationDuration: `${2 + (i % 5) * 0.3}s`,
                      }}
                    >
                      <path
                        d={leafPath(species.leaf, 7 * scale, 12 * scale)}
                        transform={`translate(${stalkX} ${topY + stalkH * 0.18}) rotate(${side * 40})`}
                        fill={fLite}
                        stroke={strokeCol}
                        strokeOpacity="0.3"
                        strokeWidth={0.4 * scale}
                      />
                    </g>
                  ))}
                </g>
              );
            });
          })()}
        </g>
      ) : (
        <g className={swayClass} style={swayProps}>
          {/* trunk, tapering slightly toward the top */}
          <rect x={50 - g.tw / 2} y={groundY - g.th} width={g.tw} height={g.th} rx={g.tw / 2} fill={trunk} />
          {/* bark texture, by species */}
          {species.bark === "rough" && (
            <g stroke={BARK_MARK} strokeWidth="1" opacity="0.45" strokeLinecap="round">
              <path d={`M${50 - g.tw * 0.22} ${groundY - g.th * 0.82} L${50 - g.tw * 0.1} ${groundY - g.th * 0.55}`} />
              <path d={`M${50 + g.tw * 0.18} ${groundY - g.th * 0.68} L${50 + g.tw * 0.28} ${groundY - g.th * 0.32}`} />
              <path d={`M${50 - g.tw * 0.08} ${groundY - g.th * 0.38} L${50 + g.tw * 0.02} ${groundY - g.th * 0.14}`} />
            </g>
          )}
          {species.bark === "banded" && (
            <g fill={BARK_MARK} opacity="0.55">
              <rect x={50 - g.tw * 0.4} y={groundY - g.th * 0.78} width={g.tw * 0.5} height="1.3" />
              <rect x={50 - g.tw * 0.15} y={groundY - g.th * 0.52} width={g.tw * 0.42} height="1.3" />
              <rect x={50 - g.tw * 0.38} y={groundY - g.th * 0.26} width={g.tw * 0.35} height="1.3" />
            </g>
          )}
          {species.bark === "tall" && (
            <g stroke={BARK_MARK} strokeWidth="0.8" opacity="0.4">
              <path d={`M${50 - g.tw / 2} ${groundY - g.th * 0.62} H${50 + g.tw / 2}`} />
              <path d={`M${50 - g.tw / 2} ${groundY - g.th * 0.3} H${50 + g.tw / 2}`} />
            </g>
          )}
          {/* a couple of bare branches show through when leaves have dropped */}
          {(bare || dead) && (
            <>
              <path d={`M50 ${groundY - g.th * 0.7} L${50 - g.r * 0.5} ${groundY - g.th - g.r * 0.4}`} stroke={trunk} strokeWidth="2.4" strokeLinecap="round" />
              <path d={`M50 ${groundY - g.th * 0.55} L${50 + g.r * 0.55} ${groundY - g.th - g.r * 0.3}`} stroke={trunk} strokeWidth="2.4" strokeLinecap="round" />
            </>
          )}
          {/* canopy — built entirely from individual leaves, no backing
              blob shape; overlap alone gives it volume */}
          {showLeaves && (
            <g opacity={bare ? 0.6 : 1}>
              {/* individual leaves, packed per the species' canopy shape,
                  shaded by a soft continuous light-from-upper-left + depth
                  gradient, and each swaying on its own clock so the canopy
                  reads as many small moving things rather than one blob */}
              {Array.from({ length: leafN }).map((_, i) => {
                const spot = leafSpot(species.canopy, i, leafN, leafR);
                const px = 50 + spot.dx;
                const py = canopyY + spot.dy;
                const sizeScale = 0.82 + ((i * 31) % 48) / 100;
                const w = 10 * sizeScale * scale, h = 15 * sizeScale * scale;
                const rot = spot.angleDeg + (((i * 53) % 40) - 20);
                const rFrac = Math.hypot(spot.dx, spot.dy) / leafR;
                const fill = shadeOf(spot.dx, spot.dy, rFrac, fLite, fMid, fDark);
                return (
                  <g
                    key={i}
                    className="leaf-sway"
                    style={{
                      transformOrigin: `${px}px ${py}px`,
                      animationDelay: `${(i % 6) * 0.25}s`,
                      animationDuration: `${2 + (i % 5) * 0.3}s`,
                    }}
                  >
                    <path
                      d={leafPath(species.leaf, w, h)}
                      transform={`translate(${px} ${py}) rotate(${rot})`}
                      fill={fill}
                      stroke={strokeCol}
                      strokeOpacity="0.3"
                      strokeWidth={0.5 * scale}
                    />
                  </g>
                );
              })}
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
