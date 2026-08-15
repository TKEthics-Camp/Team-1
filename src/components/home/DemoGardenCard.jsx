import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { demoGardenSeed } from "../../lib/demoGarden";
import Mascot from "../shared/Mascot";

// Shown only on a barren first-run garden (see HomeScreen). One tap fills
// the grove with a believable sample garden so a first-time visitor — or a
// judge — sees what Leaves becomes, instead of one lonely sprout. It
// removes itself the moment there's any real activity.
export default function DemoGardenCard() {
  const { t } = useI18n();
  const { seedDemo } = useStore();

  function plant() {
    const { interests, entries } = demoGardenSeed();
    seedDemo(interests, entries);
  }

  return (
    <div className="demo-card">
      <div className="demo-card-top">
        <Mascot size={52} className="demo-card-mascot" />
        <div className="body">
          <span className="kicker">{t("demoCardTitle")}</span>
          <div className="text">{t("demoCardBody")}</div>
        </div>
      </div>
      <button className="btn2 demo-card-btn" onClick={plant}>{t("demoCardBtn")}</button>
    </div>
  );
}
