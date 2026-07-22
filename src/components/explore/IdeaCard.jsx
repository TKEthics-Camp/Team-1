import { useI18n } from "../../i18n/I18nContext";
import { useUI } from "../../ui/UIContext";
import { PALETTE } from "../../lib/constants";
import { catLabel } from "../../lib/explore";
import Orb from "../shared/Orb";

// One hobby idea: an orb, its name + category, and a button that opens the
// new-orb sheet prefilled from it — the offline call to action.
export default function IdeaCard({ idea }) {
  const { t, lang } = useI18n();
  const { openSheet } = useUI();
  const color = PALETTE[idea[2]];
  const name = idea[lang === "en" ? 0 : 1];

  return (
    <div
      className="idea"
      role="button"
      tabIndex={0}
      onClick={() => openSheet("idea", { idea })}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openSheet("idea", { idea }); }}
    >
      <div className="orb-wrap" style={{ flex: "none" }}>
        <Orb interest={{ color, name }} size={52} />
      </div>
      <div className="grow">
        <div className="idea-nm">{name}</div>
        <div className="idea-cat">{catLabel(idea[3], lang)}</div>
      </div>
      <button
        className="idea-add"
        onClick={(e) => {
          e.stopPropagation();
          openSheet("orb", { preset: { name: idea[0], nameZh: idea[1], color } });
        }}
      >
        {t("tryThis")}
      </button>
    </div>
  );
}
