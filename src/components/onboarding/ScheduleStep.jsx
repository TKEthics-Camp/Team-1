import { useI18n } from "../../i18n/I18nContext";
import Tree from "../shared/Tree";
import Field from "../shared/Field";
import DayPicker from "../shared/DayPicker";

export default function ScheduleStep({ drafts, updateDraft, onEnter }) {
  const { t } = useI18n();

  return (
    <>
      <h2>{t("setupTitle")}</h2>
      <p>{t("setupSub")}</p>

      <div className="scroll">
        {drafts.map((d, i) => (
          <div key={d.id} className="setup-row">
            <div className="who">
              <Tree interest={d} size={34} stage={1} health="healthy" />
              <span className="n">{d.name}</span>
            </div>
            <Field label={t("timeLabel")}>
              <input type="time" value={d.time} onChange={(e) => updateDraft(i, { time: e.target.value })} />
            </Field>
            <Field label={t("daysLabel")}>
              <DayPicker days={d.days || []} onChange={(days) => updateDraft(i, { days })} />
            </Field>
          </div>
        ))}
      </div>

      <button className="btn" onClick={onEnter}>{t("next")}</button>
    </>
  );
}
