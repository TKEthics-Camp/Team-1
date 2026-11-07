import { useI18n } from "../../i18n/I18nContext";
import { useUI } from "../../ui/UIContext";
import { PALETTE } from "../../lib/constants";
import { catLabel } from "../../lib/explore";
import Icon, { Tag, hobbyLook } from "../shared/Icon";

// One hobby idea: its icon, its name + category, and a button that opens
// the new-orb sheet prefilled from it — the offline call to action.
export default function IdeaCard({ idea }) {
  const { t, lang } = useI18n();
  const { openSheet } = useUI();
  const color = PALETTE[idea[2]];
  const name = idea[lang === "en" ? 0 : 1];
  const look = hobbyLook(idea[0]);

  return (
    <div
      className="idea"
      role="button"
      tabIndex={0}
      onClick={() => openSheet("idea", { idea })}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openSheet("idea", { idea }); }}
    >
      {/* The hobby's own icon, as iOS lists lead with one. The category
          tag below stays plain text: with an icon of its own every sport
          wore the same trophy, which said "sport" twice and nothing else. */}
      <span className={"idea-ico stat-ico tag-" + look.tone} aria-hidden="true">
        <Icon name={look.icon} size={20} />
      </span>
      <div className="grow">
        <div className="idea-nm">{name}</div>
        <Tag tone={look.tone} className="idea-cat-tag">{catLabel(idea[3], lang)}</Tag>
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
