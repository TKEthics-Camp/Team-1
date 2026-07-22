import { useI18n } from "../../i18n/I18nContext";
import { useObjectURL } from "../../lib/image";
import { fmtHours } from "../../lib/derived";
import { shade } from "../../lib/color";

// The glowing sphere: replaces the original orbEl(). `label` shows the
// interest's own name + hours + streak baked into the glass.
export default function Orb({ interest, size, faceBlob = null, label = false, minutes = 0, streak = 0, style }) {
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
      </span>
    </span>
  );
}
