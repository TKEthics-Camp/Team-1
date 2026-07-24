import { shade } from "../../lib/color";
import { DEFAULT_AVATAR } from "../../lib/constants";

// A friendly cartoon person on a coloured disc — the profile picture.
// Fully drawn from a small set of choices (skin, hair, outfit) instead of an
// uploaded photo, so it's always the same flat-cute style as the rest of the
// app and always editable for free-or-coins, never a real photo of a kid.
export default function PersonAvatar({ size, color = "#FFD45E", avatar = null, decoration = null, style }) {
  const a = { ...DEFAULT_AVATAR, ...avatar };
  const w = Math.max(3, Math.round(size * 0.06));
  const cut = `radial-gradient(farthest-side, transparent calc(100% - ${w}px), #000 calc(100% - ${w}px))`;
  const outfitDark = shade(a.outfitColor, -22);

  return (
    <span className="person-av" style={{ width: size, height: size, ...style }}>
      <span
        className="person-disc"
        style={{ background: `linear-gradient(160deg, ${shade(color, 24)}, ${shade(color, -16)})` }}
      >
        <svg viewBox="0 0 100 100" aria-hidden="true">
          {/* outfit / shoulders — a tight head-and-shoulders crop, so there's
              never an abrupt cut at the frame's edge */}
          {a.outfit === "overalls" ? (
            <>
              <path d="M0 100 V90 Q0 80 18 78 Q50 87 82 78 Q100 80 100 90 V100 Z" fill="#F4F1EA" />
              <rect x="30" y="72" width="7" height="20" rx="2" fill={a.outfitColor} transform="rotate(-8 30 72)" />
              <rect x="63" y="72" width="7" height="20" rx="2" fill={a.outfitColor} transform="rotate(8 63 72)" />
              <path d="M32 84 Q50 78 68 84 L70 100 L30 100 Z" fill={a.outfitColor} />
            </>
          ) : (
            <path d="M0 100 V90 Q0 80 18 78 Q50 87 82 78 Q100 80 100 90 V100 Z" fill={a.outfitColor} />
          )}
          {a.outfit === "hoodie" && (
            <path d="M22 80 Q50 100 78 80 Q68 68 50 68 Q32 68 22 80 Z" fill={outfitDark} />
          )}

          {/* head */}
          <circle cx="50" cy="42" r="27" fill={a.skin} />

          {/* hair, behind/around the head depending on style. The long
              strands are drawn first, reaching up well past the crown's
              bottom edge, so the crown (drawn after, on top) overlaps them
              with no visible seam — a real flow into the crown rather than
              two separate pieces stuck on either side of it. */}
          {a.hair === "long" && (
            <>
              <path d="M20 28 Q12 58 18 87 Q24 90 30 86 Q25 60 27 30 Z" fill={a.hairColor} />
              <path d="M80 28 Q88 58 82 87 Q76 90 70 86 Q75 60 73 30 Z" fill={a.hairColor} />
            </>
          )}
          {(a.hair === "short" || a.hair === "long") && (
            <path d="M22 36 Q24 12 50 10 Q76 12 78 36 Q78 22 50 18 Q22 22 22 36 Z" fill={a.hairColor} />
          )}
          {a.hair === "curly" && (
            <>
              {[[26, 24], [38, 14], [50, 11], [62, 14], [74, 24]].map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r="9.5" fill={a.hairColor} />
              ))}
            </>
          )}
          {a.hair === "spiky" && (
            <polygon
              points="21,34 27,14 33,30 41,10 47,28 53,9 59,28 67,11 73,30 79,15 82,34"
              fill={a.hairColor}
            />
          )}
          {/* face — eyes and a smile, no more */}
          <circle cx="41" cy="41" r="3.4" fill="#4A3363" />
          <circle cx="59" cy="41" r="3.4" fill="#4A3363" />
          <path d="M41 51 Q50 58 59 51" stroke="#4A3363" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
      </span>
      {decoration && decoration.ring && (
        <span className="person-ring" style={{ background: decoration.ring, WebkitMask: cut, mask: cut }} />
      )}
      {decoration && decoration.badge && (
        <span className="person-badge" style={{ fontSize: Math.round(size * 0.34) }}>{decoration.badge}</span>
      )}
    </span>
  );
}
