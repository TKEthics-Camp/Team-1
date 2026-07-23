import { useI18n } from "../../i18n/I18nContext";
import Orb from "../shared/Orb";
import Field from "../shared/Field";

export default function ScheduleStep({ drafts, updateDraft, onEnter }) {
  const { t, nameOf } = useI18n();

  return (
    <>
      <h2>{t("setupTitle")}</h2>
      <p>{t("setupSub")}</p>

      <div className="scroll">
        {drafts.map((d, i) => (
          <div key={d.id} className="setup-row">
            <div className="who">
              <Orb interest={d} size={30} />
              <span className="n">{nameOf(d)}</span>
            </div>
            <Field label={t("timeLabel")}>
              <input type="time" value={d.time} onChange={(e) => updateDraft(i, { time: e.target.value })} />
            </Field>
            <Field label={t("friendsLabel")}>
              <input
                type="text"
                placeholder={t("friendsPh")}
                maxLength={60}
                onChange={(e) => updateDraft(i, {
                  friends: e.target.value.split(/[,，]/).map((x) => x.trim()).filter(Boolean),
                })}
              />
            </Field>
          </div>
        ))}
      </div>

      <button className="btn" onClick={onEnter}>{t("enter")}</button>
    </>
  );
}
