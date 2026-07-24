import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { photosOf } from "../../lib/derived";
import { treeStage, treeHealth, STAGE_KEY } from "../../lib/tree";
import TopBar from "../shared/TopBar";
import Tree from "../shared/Tree";
import LevelUpBurst from "../shared/LevelUpBurst";

export default function SavedScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, nameOf } = useI18n();
  const { interests, photos, entries } = useStore();

  const it = interests.find((x) => x.id === id) || interests[0];
  const leveledUp = !!location.state?.leveledUp;

  useEffect(() => {
    if (!it) navigate("/", { replace: true });
  }, [it, navigate]);

  if (!it) return null;

  const stage = treeStage(it, entries, photos);
  const health = treeHealth(it, entries, photos);

  return (
    <>
      <TopBar><h1>{t("appName")}</h1></TopBar>
      <div className="view">
        {leveledUp && <LevelUpBurst />}
        <div className="onb center">
          <div className="grow" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <Tree interest={it} size={110} stage={stage} health={health} className={health === "healthy" ? "alive" : ""} />
            {leveledUp ? (
              <>
                <h2>{t("leveledUpTitle").replace("{h}", nameOf(it))}</h2>
                <p style={{ margin: "0 auto" }}>{t("leveledUpSub").replace("{s}", t(STAGE_KEY[stage]))}</p>
              </>
            ) : (
              <>
                <h2>{t("done")}</h2>
                <p style={{ margin: "0 auto" }}>{t("putDown")}</p>
              </>
            )}
          </div>
          <button className="btn" onClick={() => navigate("/")}>{t("backToShelf")}</button>
        </div>
      </div>
    </>
  );
}
