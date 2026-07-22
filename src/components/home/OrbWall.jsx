import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useUI } from "../../ui/UIContext";
import { photosOf, minutesOf, interestStreak, fmtHours } from "../../lib/derived";
import Orb from "../shared/Orb";

// Sizes and drift speeds vary per orb so the wall reads as a sky, not a table.
const SIZES = [148, 124, 136, 116, 142, 128];
const DURS = [7.4, 9.1, 8.2, 10.3, 7.9, 8.8];

export default function OrbWall({ interests, photos, entries }) {
  const { t, nameOf } = useI18n();
  const { openSheet } = useUI();
  const navigate = useNavigate();

  return (
    <div className="orbwall">
      {interests.map((it, i) => {
        const ph = photosOf(photos, it.id)[0];
        const size = SIZES[i % SIZES.length];
        const minutes = minutesOf(entries, it.id);
        const streak = interestStreak(entries, photos, it.id);
        return (
          <button
            key={it.id}
            className="orb-cell"
            aria-label={`${nameOf(it)}, ${fmtHours(minutes)}`}
            onClick={() => navigate(`/interest/${it.id}?tab=album`)}
          >
            <div
              className="orb-wrap"
              style={{ "--dur": `${DURS[i % DURS.length]}s`, animationDelay: `${(-i * 1.7).toFixed(1)}s` }}
            >
              <Orb interest={it} size={size} faceBlob={ph && ph.blob} label minutes={minutes} streak={streak} />
            </div>
          </button>
        );
      })}
      <button className="orb-cell add-orb" aria-label={t("newInterest")} onClick={() => openSheet("orb")}>
        <div className="orb-wrap">
          <div className="plus" aria-hidden="true">+</div>
          <div className="orb-name">{t("newInterest")}</div>
        </div>
      </button>
    </div>
  );
}
