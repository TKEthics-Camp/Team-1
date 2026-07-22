import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { IDEAS } from "../../lib/constants";
import { recommendations, shuffled, haveName } from "../../lib/explore";
import IdeaCard from "./IdeaCard";

export default function IdeasTab() {
  const { t, lang, nameOf } = useI18n();
  const { interests } = useStore();
  const [seed, setSeed] = useState(7);

  const r = recommendations(interests, nameOf, lang);
  const list = shuffled(
    IDEAS.filter((i) => !haveName(interests, i[0]) && !haveName(interests, i[1])),
    seed
  );

  return (
    <>
      <div className="safe-note">
        <span aria-hidden="true">🔒</span>
        <span>{t("exploreNote")}</span>
      </div>

      {r.list.length > 0 && (
        <>
          {r.reason && (
            <div className="recs-because">
              <span className="label">{t("recs")}</span>
              <span className="sub">{" · " + t("recsBecause") + r.reason}</span>
            </div>
          )}
          <div className="ideas">
            {r.list.map((idea) => <IdeaCard key={idea[0]} idea={idea} />)}
          </div>
        </>
      )}

      <div className="row" style={{ marginTop: 4 }}>
        <div className="label grow">{t("exploreSub")}</div>
        <button className="chip" onClick={() => setSeed((s) => s + 1)}>{"🔀 " + t("reshuffle")}</button>
      </div>
      <div className="ideas">
        {list.map((idea) => <IdeaCard key={idea[0]} idea={idea} />)}
      </div>
    </>
  );
}
