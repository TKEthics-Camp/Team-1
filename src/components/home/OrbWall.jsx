import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { photosOf } from "../../lib/derived";
import Orb from "../shared/Orb";

const ORB_SIZE = 148;

export default function OrbWall({ interests, photos }) {
  const { nameOf } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="orbwall">
      {interests.map((it) => {
        const ph = photosOf(photos, it.id)[0];
        return (
          <button
            key={it.id}
            className="orb-cell"
            aria-label={nameOf(it)}
            onClick={() => navigate(`/interest/${it.id}?tab=album`)}
          >
            <Orb interest={it} size={ORB_SIZE} faceBlob={ph && ph.blob} />
            <div className="orb-name">{nameOf(it)}</div>
          </button>
        );
      })}
    </div>
  );
}
