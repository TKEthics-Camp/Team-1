import { useI18n } from "../../i18n/I18nContext";
import { PALETTE } from "../../lib/constants";
import Orb from "../shared/Orb";

const DEMO = [
  { color: PALETTE[4], size: 96, top: 40, left: 90 },
  { color: PALETTE[0], size: 118, top: 0, left: 30 },
  { color: PALETTE[7], size: 66, top: 96, left: 0 },
];

export default function WelcomeStep({ onBegin }) {
  const { t } = useI18n();
  return (
    <>
      <div className="orb-cluster">
        {DEMO.map((d, i) => (
          <Orb key={i} interest={{ color: d.color, name: "" }} size={d.size} style={{ top: d.top, left: d.left }} />
        ))}
      </div>
      <h2>{t("welcome")}</h2>
      <p>{t("welcomeSub")}</p>
      <div className="grow" />
      <button className="btn" onClick={onBegin}>{t("begin")}</button>
    </>
  );
}
