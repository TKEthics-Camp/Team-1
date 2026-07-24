import { useI18n } from "../../i18n/I18nContext";
import { useObjectURL } from "../../lib/image";
import { fmtDate, dateKey } from "../../lib/dates";
import { ideaCat } from "../../lib/explore";
import { scene } from "../../lib/community";

export default function InterestCover({ interest, firstPhoto }) {
  const { t, lang, nameOf } = useI18n();
  const url = useObjectURL(firstPhoto ? firstPhoto.blob : null);

  // With no photo yet, draw an illustration that matches the hobby (paint for
  // Drawing, a ball for Basketball…) instead of a bare initial. A category
  // the user picked themselves (OrbSheet) always wins — it's the only way a
  // made-up hobby name that isn't one of the curated ideas gets an
  // illustration at all, not just a blank initial. Falls back to the letter
  // only when there's no photo, no chosen category, and no inferable one.
  const cat = firstPhoto ? null : (interest.category || ideaCat(interest.name));
  const hasVisual = Boolean(firstPhoto || cat);

  return (
    <div className={hasVisual ? "cover" : "cover blank"} style={{ "--c": interest.color }}>
      {firstPhoto ? (
        <img src={url} alt={t("coverAlt")} />
      ) : cat ? (
        <div className="cover-scene" aria-hidden="true" dangerouslySetInnerHTML={{ __html: scene(cat, 0, interest.name) }} />
      ) : (
        <span className="mono" aria-hidden="true">{nameOf(interest).slice(0, 1).toUpperCase()}</span>
      )}
      <div className="veil" />
      <div className="cap">
        <div className="t">{nameOf(interest)}</div>
        <div className="s">
          {firstPhoto
            ? (firstPhoto.caption || fmtDate(dateKey(new Date(firstPhoto.createdAt)), lang))
            : t("firstPhoto")}
        </div>
      </div>
    </div>
  );
}
