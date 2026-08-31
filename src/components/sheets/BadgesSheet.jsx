import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { badgeState } from "../../lib/badges";
import Sheet from "../shared/Sheet";

export default function BadgesSheet() {
  const { t } = useI18n();
  const { interests, entries, photos } = useStore();
  const { closeSheet } = useUI();

  const badges = badgeState(interests, entries, photos);
  const earned = badges.filter((b) => b.earned).length;

  return (
    <Sheet onClose={closeSheet}>
      <h2>{t("badges")}</h2>
      <div className="sub">{t("badgesEarned").replace("{n}", earned).replace("{total}", badges.length)}</div>

      <div className="badge-grid">
        {badges.map((b) => (
          <div key={b.id} className={"badge" + (b.earned ? " earned" : "")}>
            <span className="badge-ico" aria-hidden="true">{b.icon}</span>
            <span className="badge-nm">{t("badge_" + b.id)}</span>
            {b.earned ? (
              <span className="badge-sub">{t("badgeDone")}</span>
            ) : (
              <>
                {/* the bar is what makes the next one feel reachable — a
                    locked badge with no sense of distance is just a blank */}
                <span className="badge-bar" aria-hidden="true">
                  <span style={{ width: Math.round((b.have / b.need) * 100) + "%" }} />
                </span>
                <span className="badge-sub">{b.have + " / " + b.need}</span>
              </>
            )}
          </div>
        ))}
      </div>

      <button className="btn2" onClick={closeSheet}>{t("close")}</button>
    </Sheet>
  );
}
