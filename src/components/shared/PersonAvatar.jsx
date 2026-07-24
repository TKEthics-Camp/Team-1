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
  const hairDark = shade(a.hairColor, -22);
  const hairLight = shade(a.hairColor, 26);

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
          {a.outfit === "collared" && (
            <path d="M41 76 L50 86 L59 76 L54 73 L50 79 L46 73 Z" fill="#FFFFFF" />
          )}
          {a.outfit === "vest" && (
            <path d="M31 77 Q50 86 69 77 L69 100 Q50 93 31 100 Z" fill={outfitDark} />
          )}

          {/* afro grows behind the head as a halo, so it must be drawn before
              the head circle below — every other style sits on top of it */}
          {a.hair === "afro" && (
            <circle cx="50" cy="34" r="30" fill={a.hairColor} />
          )}

          {/* head */}
          <circle cx="50" cy="42" r="27" fill={a.skin} />

          {/* hair, behind/around the head depending on style */}
          {a.hair === "long" && (
            <>
              {/* outer locks, each with an inner shadow band and a light
                  strand-line down the middle, instead of one flat shape */}
              <path d="M14 38 Q9 56 13 74 Q16 84 26 88 L32 86 Q23 81 21 70 Q18 55 24 39 Z" fill={a.hairColor} />
              <path d="M86 38 Q91 56 87 74 Q84 84 74 88 L68 86 Q77 81 79 70 Q82 55 76 39 Z" fill={a.hairColor} />
              <path d="M19 42 Q16 56 18 72 Q20 79 26 83 L27 81 Q23 76 21 68 Q19 55 24 43 Z" fill={hairDark} />
              <path d="M81 42 Q84 56 82 72 Q80 79 74 83 L73 81 Q77 76 79 68 Q81 55 76 43 Z" fill={hairDark} />
              <path d="M17 44 Q14 58 17 74" stroke={hairLight} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".6" />
              <path d="M83 44 Q86 58 83 74" stroke={hairLight} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".6" />
            </>
          )}
          {(a.hair === "short" || a.hair === "long" || a.hair === "ponytail" || a.hair === "bun") && (
            <>
              <path d="M22 36 Q24 12 50 10 Q76 12 78 36 Q78 22 50 18 Q22 22 22 36 Z" fill={a.hairColor} />
              <path d="M28 20 Q50 13 72 20" stroke={hairLight} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".55" />
              {a.hair === "long" && (
                <path d="M50 11 L50 19" stroke={hairDark} strokeWidth="1.3" strokeLinecap="round" opacity=".6" />
              )}
            </>
          )}
          {a.hair === "curly" && (
            <>
              {[[26, 24, 0], [38, 14, 1], [50, 11, 0], [62, 14, 1], [74, 24, 0]].map(([cx, cy, dark], i) => (
                <circle key={i} cx={cx} cy={cy} r="9.5" fill={dark ? hairDark : a.hairColor} />
              ))}
              {[[26, 24], [50, 11], [74, 24]].map(([cx, cy], i) => (
                <circle key={"hl" + i} cx={cx - 3} cy={cy - 3} r="2.6" fill={hairLight} opacity=".55" />
              ))}
            </>
          )}
          {a.hair === "spiky" && (
            <>
              {/* five separate blades, alternating tone, base-to-base so the
                  whole crown reads as one head of hair, not a single zigzag */}
              <path d="M19 36 Q20 24 24 14 Q28 24 29 32 Q24 35 19 36 Z" fill={a.hairColor} />
              <path d="M29 32 Q31 20 37 10 Q42 20 43 28 Q36 31 29 32 Z" fill={hairDark} />
              <path d="M43 28 Q45 16 50 8 Q54 16 57 28 Q50 30 43 28 Z" fill={a.hairColor} />
              <path d="M71 32 Q69 20 63 10 Q58 20 57 28 Q64 31 71 32 Z" fill={hairDark} />
              <path d="M81 36 Q80 24 76 14 Q72 24 71 32 Q76 35 81 36 Z" fill={a.hairColor} />
              <path d="M24 30 L24 16" stroke={hairLight} strokeWidth="1.4" strokeLinecap="round" opacity=".6" />
              <path d="M50 26 L50 10" stroke={hairLight} strokeWidth="1.4" strokeLinecap="round" opacity=".6" />
              <path d="M76 30 L76 16" stroke={hairLight} strokeWidth="1.4" strokeLinecap="round" opacity=".6" />
            </>
          )}
          {a.hair === "ponytail" && (
            <path d="M78 30 Q94 34 91 54 Q89 65 79 61 Q85 46 75 34 Z" fill={a.hairColor} />
          )}
          {a.hair === "bun" && (
            <circle cx="50" cy="9" r="8" fill={a.hairColor} />
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
