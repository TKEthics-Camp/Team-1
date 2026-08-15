import { useI18n } from "../../i18n/I18nContext";
import { useObjectURL } from "../../lib/image";
import { fmtHours } from "../../lib/derived";
import { shade } from "../../lib/color";

// The glowing sphere: replaces the original orbEl(). `label` shows the
// interest's own name + hours + streak baked into the glass.
export default function Orb({ interest, size, faceBlob = null, label = false, minutes = 0, streak = 0, decoration = null, style }) {
  const { nameOf } = useI18n();
  const url = useObjectURL(faceBlob);

  const orbStyle = { width: size, height: size };
  if (!url) {
    orbStyle.background =
      `radial-gradient(circle at 34% 30%, ${shade(interest.color, 45)} 0%, ${interest.color} 46%, ${shade(interest.color, -60)} 100%)`;
  } else {
    orbStyle.backgroundImage = `url(${url})`;
  }

  return (
    <span className="orb-glow" style={{ "--c": interest.color, ...style }}>
      <span className="orb" style={orbStyle}>
        {url && <span className="wash" />}
        {label && (
          <span className="orb-label">
            <span className="nm" style={{ fontSize: Math.round(size * 0.125) }}>{nameOf(interest)}</span>
            <span className="hrs" style={{ fontSize: Math.round(size * 0.115) }}>{fmtHours(minutes)}</span>
            {streak > 0 && (
              <span className="flame" style={{ fontSize: Math.round(size * 0.10) }}>{"🔥 " + streak}</span>
            )}
          </span>
        )}
        <span className="glass" />
        <span className="spark" />
        {decoration && decoration.ring && (() => {
          // A ring is a donut: paint the whole disc, then mask out everything
          // but a thin band at the rim — the only way to get a *gradient*
          // ring (painting's rainbow) since box-shadow can't take one.
          const w = Math.max(3, Math.round(size * 0.06));
          const cut = `radial-gradient(farthest-side, transparent calc(100% - ${w}px), #000 calc(100% - ${w}px))`;
          return (
            <span
              className="orb-deco-ring"
              style={{ background: decoration.ring, WebkitMask: cut, mask: cut }}
            />
          );
        })()}
        {decoration && decoration.badge && (
          <span className="orb-deco-badge" style={{ fontSize: Math.round(size * 0.34) }}>{decoration.badge}</span>
        )}
      </span>
    </span>
  );
}
