import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { photosOf } from "../../lib/derived";
import TopBar from "../shared/TopBar";
import Orb from "../shared/Orb";

export default function SavedScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { interests, photos } = useStore();

  const it = interests.find((x) => x.id === id) || interests[0];

  useEffect(() => {
    if (!it) navigate("/", { replace: true });
  }, [it, navigate]);

  if (!it) return null;

  const firstPhoto = photosOf(photos, it.id)[0];

  return (
    <>
      <TopBar><h1>{t("appName")}</h1></TopBar>
      <div className="view">
        <div className="onb center">
          <div className="grow" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div className="orb-wrap">
              <Orb interest={it} size={92} faceBlob={firstPhoto ? firstPhoto.blob : null} />
            </div>
            <h2>{t("done")}</h2>
            <p style={{ margin: "0 auto" }}>{t("putDown")}</p>
          </div>
          <button className="btn" onClick={() => navigate("/")}>{t("backToShelf")}</button>
        </div>
      </div>
    </>
  );
}
