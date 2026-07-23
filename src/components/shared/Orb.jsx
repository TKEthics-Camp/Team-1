import { useI18n } from "../../i18n/I18nContext";
import { useObjectURL } from "../../lib/image";

// A flat, ring-bordered circle: a photo when the interest has one, otherwise
// a flat color fill with the interest's initial. Name is rendered by the
// caller underneath — this component only draws the circle itself.
export default function Orb({ interest, size, faceBlob = null, style }) {
  const { nameOf } = useI18n();
  const url = useObjectURL(faceBlob);

  return (
    <span className="orb-ring" style={{ "--c": interest.color, ...style }}>
      <span className="orb" style={{ width: size, height: size }}>
        {url ? (
          <img src={url} alt="" />
        ) : (
          <span className="initial" style={{ fontSize: Math.round(size * 0.36) }}>
            {(nameOf(interest) || "").slice(0, 1).toUpperCase()}
          </span>
        )}
      </span>
    </span>
  );
}
