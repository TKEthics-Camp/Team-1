import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { daysUntilDeath } from "../../lib/tree";

// The last honest warning before a tree is gone. The app's decay is
// deliberately unforgiving — no grace periods, no freezes — so the one thing
// it owes you is telling you *before* it happens rather than after. Shows the
// tree closest to dying; tapping goes straight to it, since the only fix is
// logging something there.
export default function DyingBanner({ interest, entries, photos }) {
  const { t, nameOf } = useI18n();
  const navigate = useNavigate();
  const left = daysUntilDeath(interest, entries, photos);

  return (
    <button
      type="button"
      className="nudge dying"
      onClick={() => navigate(`/interest/${interest.id}?tab=journal`)}
    >
      <span className="dying-ico" aria-hidden="true">🥀</span>
      <span className="dying-txt">
        <span className="t">{t("dyingTitle").replace("{name}", nameOf(interest))}</span>
        <span className="sub">
          {(left === 1 ? t("dyingOneDay") : t("dyingDays").replace("{n}", left))}
        </span>
      </span>
    </button>
  );
}
