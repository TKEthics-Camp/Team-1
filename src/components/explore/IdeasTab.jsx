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
  // Ideas already surfaced under "For you" are dropped from the full list, so
  // the two sections never repeat the same card.
  const recNames = new Set(r.list.map((i) => i[0]));
  const list = shuffled(
    IDEAS.filter(
      (i) => !haveName(interests, i[0]) && !haveName(interests, i[1]) && !recNames.has(i[0])
    ),
    seed
  );

  return (
    <>
      <div className="safe-note">
        <span aria-hidden="true">🔒</span>
        <span>{t("exploreNote")}</span>
      </div>

      {r.list.length > 0 && (
        <section>
          <div className="section-head">
            <span className="h">{t("recs")}</span>
            <span className="why">{r.reason ? t("recsBecause") + r.reason : t("recsSub")}</span>
          </div>
          <div className="section-rule" />
          <div className="ideas" style={{ marginTop: 10 }}>
            {r.list.map((idea) => <IdeaCard key={idea[0]} idea={idea} />)}
          </div>
        </section>
      )}

      <section style={{ marginTop: r.list.length ? 6 : 0 }}>
        <div className="section-head">
          <span className="h">{r.list.length ? t("allHobbies") : t("exploreSub")}</span>
          <span className="spacer" />
          <button className="chip" onClick={() => setSeed((s) => s + 1)}>{"🔀 " + t("reshuffle")}</button>
        </div>
        <div className="section-rule" />
        <div className="ideas" style={{ marginTop: 10 }}>
          {list.map((idea) => <IdeaCard key={idea[0]} idea={idea} />)}
        </div>
      </section>
    </>
  );
}
