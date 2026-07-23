import { useI18n } from "../../i18n/I18nContext";
import { useUI } from "../../ui/UIContext";
import { PALETTE } from "../../lib/constants";
import { catLabel } from "../../lib/explore";
import { scene } from "../../lib/community";
import Sheet from "../shared/Sheet";

// Tap a hobby idea: a picture and a plain-language description, so a kid
// who's never tried it can tell what it actually involves before starting.
export default function IdeaSheet({ idea }) {
  const { t, lang } = useI18n();
  const { closeSheet, openSheet } = useUI();
  if (!idea) return null;

  const name = idea[lang === "en" ? 0 : 1];
  const color = PALETTE[idea[2]];
  const cat = idea[3];
  const desc = idea[lang === "en" ? 4 : 5];

  return (
    <Sheet onClose={closeSheet}>
      <div className="post-pic" dangerouslySetInnerHTML={{ __html: scene(idea[0], cat, idea[2]) }} />
      <div>
        <h2>{name}</h2>
        <div className="sub">{catLabel(cat, lang)}</div>
      </div>
      {desc && <p className="idea-desc">{desc}</p>}
      <button
        className="btn"
        onClick={() => openSheet("orb", { preset: { name: idea[0], nameZh: idea[1], color } })}
      >
        {t("tryThis")}
      </button>
      <button className="btn2" onClick={closeSheet}>{t("close")}</button>
    </Sheet>
  );
}
