import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { PALETTE, SKIN_TONES, HAIR_COLORS, HAIR_STYLES, OUTFIT_STYLES, OUTFIT_COLORS, DEFAULT_AVATAR } from "../../lib/constants";
import Sheet from "../shared/Sheet";
import PersonAvatar from "../shared/PersonAvatar";

// Build-a-person: skin tone and every colour are free, hair/outfit *styles*
// beyond the basics cost coins — the same currency the hobby decorations in
// the Market spend. Every choice equips (and, for coins, buys) immediately;
// there's no separate "save" step.
export default function AvatarSheet() {
  const { t, lang } = useI18n();
  const { profile, updateProfile, buyAndEquipAvatarPart } = useStore();
  const { closeSheet } = useUI();

  const avatar = { ...DEFAULT_AVATAR, ...(profile && profile.avatar) };
  const coins = (profile && profile.coins) || 0;
  const ownedHair = (profile && profile.ownedHair) || [];
  const ownedOutfits = (profile && profile.ownedOutfits) || [];

  function set(patch) {
    updateProfile({ avatar: { ...avatar, ...patch } });
  }

  function pickStyle(kind, id, list, owned) {
    const item = list.find((x) => x.id === id);
    const isOwned = item.price === 0 || owned.includes(id);
    if (isOwned) { set({ [kind]: id }); return; }
    if (coins < item.price) return; // can't afford — button is disabled anyway
    if (buyAndEquipAvatarPart(kind, id)) set({ [kind]: id });
  }

  return (
    <Sheet onClose={closeSheet}>
      <div className="orb-sheet-preview">
        <PersonAvatar color={PALETTE[0]} avatar={avatar} size={92} />
      </div>
      <h2>{t("customizeTitle")}</h2>
      <span className="chip coin-pill">{"🪙 " + coins}</span>

      <div className="label">{t("skinLabel")}</div>
      <div className="swatches">
        {SKIN_TONES.map((c) => (
          <button key={c} type="button" className="swatch" aria-pressed={avatar.skin === c} style={{ background: c }} onClick={() => set({ skin: c })} />
        ))}
      </div>

      <div className="label">{t("hairLabel")}</div>
      <div className="species-row">
        {HAIR_STYLES.map((h) => {
          const owned = h.price === 0 || ownedHair.includes(h.id);
          return (
            <button
              key={h.id}
              type="button"
              className="species-btn"
              aria-pressed={avatar.hair === h.id}
              disabled={!owned && coins < h.price}
              onClick={() => pickStyle("hair", h.id, HAIR_STYLES, ownedHair)}
            >
              <span>{h.name[lang === "en" ? 0 : 1]}</span>
              {!owned && <span className="part-price">{"🪙 " + h.price}</span>}
            </button>
          );
        })}
      </div>
      {avatar.hair !== "bald" && (
        <div className="swatches">
          {HAIR_COLORS.map((c) => (
            <button key={c} type="button" className="swatch" aria-pressed={avatar.hairColor === c} style={{ background: c }} onClick={() => set({ hairColor: c })} />
          ))}
        </div>
      )}

      <div className="label">{t("outfitLabel")}</div>
      <div className="species-row">
        {OUTFIT_STYLES.map((o) => {
          const owned = o.price === 0 || ownedOutfits.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              className="species-btn"
              aria-pressed={avatar.outfit === o.id}
              disabled={!owned && coins < o.price}
              onClick={() => pickStyle("outfit", o.id, OUTFIT_STYLES, ownedOutfits)}
            >
              <span>{o.name[lang === "en" ? 0 : 1]}</span>
              {!owned && <span className="part-price">{"🪙 " + o.price}</span>}
            </button>
          );
        })}
      </div>
      <div className="swatches">
        {OUTFIT_COLORS.map((c) => (
          <button key={c} type="button" className="swatch" aria-pressed={avatar.outfitColor === c} style={{ background: c }} onClick={() => set({ outfitColor: c })} />
        ))}
      </div>

      <button className="btn" onClick={closeSheet}>{t("close")}</button>
    </Sheet>
  );
}
