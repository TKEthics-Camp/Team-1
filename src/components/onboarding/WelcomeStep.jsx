import { useI18n } from "../../i18n/I18nContext";
import { PALETTE } from "../../lib/constants";
import Tree from "../shared/Tree";

// A little grove to set the tone — three trees at different growth stages.
const DEMO = [
  { color: PALETTE[3], size: 78, stage: 3 },
  { color: PALETTE[0], size: 62, stage: 1 },
  { color: PALETTE[1], size: 70, stage: 2 },
];

export default function WelcomeStep({ onBegin }) {
  const { t } = useI18n();
  return (
    <>
      <div className="tree-wall" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {DEMO.map((d, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "center", alignItems: "flex-end" }}>
            <Tree interest={{ color: d.color }} size={d.size} stage={d.stage} health="healthy" className="alive" />
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
