import { useI18n } from "../../i18n/I18nContext";
import { PALETTE } from "../../lib/constants";
import Orb from "../shared/Orb";

const DEMO_COLORS = [PALETTE[0], PALETTE[1], PALETTE[3]];
const DEMO_SIZES = [72, 58, 64];

export default function WelcomeStep({ onBegin }) {
  const { t } = useI18n();
  return (
    <>
      <div className="orbwall">
        {DEMO_COLORS.map((color, i) => (
          <div key={i} className="orb-wrap" style={{ animationDelay: `${i * 1.4}s` }}>
            <Orb interest={{ color, name: "" }} size={DEMO_SIZES[i]} />
          </div>
        ))}
      </div>
      <h2>{t("welcome")}</h2>
      <p>{t("welcomeSub")}</p>
      <div className="grow" />
      <button className="btn" onClick={onBegin}>{t("begin")}</button>
    </>
  );
}
