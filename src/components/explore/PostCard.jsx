import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { PALETTE } from "../../lib/constants";
import { fmtHours } from "../../lib/derived";
import { catLabel, hobbyName, haveHobby, ideaColor } from "../../lib/explore";
import { scene, relTime } from "../../lib/community";
import Avatar from "./Avatar";

// A fabricated community moment: an illustrated scene, an (optionally
// anonymised) author, and a button that always ends by sending the kid
// offline — either logging their own or starting the hobby.
export default function PostCard({ post, style }) {
  const { t, lang } = useI18n();
  const { interests } = useStore();
  const { openSheet } = useUI();
  const named = style === "named";
  const st = post.student;
  const has = haveHobby(interests, post.hobby);

  function act() {
    const mine = interests.find(
      (it) => it.name.toLowerCase() === post.hobby[0].toLowerCase() || (it.nameZh && it.nameZh === post.hobby[1])
    );
    if (mine) openSheet("entry", mine.id);
    else openSheet("orb", { preset: { name: post.hobby[0], nameZh: post.hobby[1], color: PALETTE[ideaColor(post.hobby[0])] } });
  }

  return (
    <div className="post">
      <div className="post-pic" dangerouslySetInnerHTML={{ __html: scene(post.cat, post.seed) }} />
      <div className="post-body">
        <div className="post-who">
          {named ? <Avatar student={st} size={30} /> : <div className="avatar anon">🙂</div>}
          <div>
            <div className="post-nm">{named ? st.name[lang === "en" ? 0 : 1] : t("someone")}</div>
            <div className="post-sub">{catLabel(post.cat, lang) + " · " + relTime(post.daysAgo, lang, t)}</div>
          </div>
        </div>
        <div className="post-cap">{post.caption[lang === "en" ? 0 : 1]}</div>
        <div className="post-foot">
          <span className="post-min">{"⏱ " + fmtHours(post.minutes) + " · " + hobbyName(post.hobby, lang)}</span>
          <button className="idea-add" onClick={act}>{has ? t("logYours") : t("startThis")}</button>
        </div>
      </div>
    </div>
  );
}
