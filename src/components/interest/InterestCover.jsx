import { useI18n } from "../../i18n/I18nContext";
import { useObjectURL } from "../../lib/image";
import { fmtDate, dateKey } from "../../lib/dates";

export default function InterestCover({ interest, firstPhoto }) {
  const { t, lang, nameOf } = useI18n();
  const url = useObjectURL(firstPhoto ? firstPhoto.blob : null);

  return (
    <div className={firstPhoto ? "cover" : "cover blank"} style={{ "--c": interest.color }}>
      {firstPhoto ? (
        <img src={url} alt={t("coverAlt")} />
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
