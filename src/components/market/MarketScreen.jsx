import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { PALETTE, DECORATIONS } from "../../lib/constants";
import TopBar from "../shared/TopBar";
import PersonAvatar from "../shared/PersonAvatar";

export default function MarketScreen() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { profile, buyDecoration, equipDecoration } = useStore();

  if (!profile) return null;

  const coins = profile.coins || 0;
  const owned = profile.ownedDecorations || [];
  const equipped = profile.equippedDecoration || null;

  return (
    <>
      <TopBar>
        <button className="icon" aria-label={t("back")} onClick={() => navigate("/profile")}>←</button>
        <h1>{t("market")}</h1>
        <span className="chip coin-pill">{"🪙 " + coins}</span>
      </TopBar>
      <div className="view">
        <div className="sub">{t("marketNote")}</div>
        <div className="scroll">
          <div className="deco-grid">
            {DECORATIONS.map((deco) => {
              const isOwned = owned.includes(deco.id);
              const isEquipped = equipped === deco.id;
              return (
                <div key={deco.id} className="deco-card">
                  <PersonAvatar color={PALETTE[0]} decoration={deco} size={64} />
                  <div className="deco-nm">{deco.name[lang === "en" ? 0 : 1]}</div>
                  {isOwned ? (
                    <button
                      className="btn2"
                      aria-pressed={isEquipped}
                      onClick={() => equipDecoration(isEquipped ? null : deco.id)}
                    >
                      {isEquipped ? t("equipped") : t("equip")}
                    </button>
                  ) : (
                    <button className="btn2" disabled={coins < deco.price} onClick={() => buyDecoration(deco.id)}>
                      {"🪙 " + deco.price}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
