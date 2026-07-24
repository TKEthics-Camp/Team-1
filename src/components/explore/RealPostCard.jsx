import { useI18n } from "../../i18n/I18nContext";
import { useAuth } from "../../store/AuthContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { fmtHours } from "../../lib/derived";
import { catLabel, ideaCat, haveName } from "../../lib/explore";
import { scene, relTime } from "../../lib/community";

// A real public journal entry, from this Supabase project's own users — the
// counterpart to PostCard's fabricated ones. Whether it's shown named is the
// *author's* call, not the viewer's: their own posts follow their own
// commStyle preference (see CommunityTab), and everyone else's default to
// anonymous since there's nowhere yet for another user to have set that
// preference for themselves.
export default function RealPostCard({ post }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { profile, interests, updateProfile } = useStore();
  const { openSheet } = useUI();

  const isMine = user && post.authorId === user.id;
  const named = isMine ? (profile && profile.commStyle) === "named" : false;
  const cat = post.category || ideaCat(post.hobbyName);
  const daysAgo = Math.max(0, Math.floor((Date.now() - post.createdAt) / 86400000));
  const already = haveName(interests, post.hobbyName);

  function act() {
    const mine = interests.find((it) => it.name.toLowerCase() === post.hobbyName.toLowerCase());
    if (mine) openSheet("entry", mine.id);
    else openSheet("orb", { preset: { name: post.hobbyName, color: post.color } });
  }

  return (
    <div className="post">
      <div className="post-pic" dangerouslySetInnerHTML={{ __html: scene(cat, post.id.length, post.hobbyName) }} />
      <div className="post-body">
        <div className="post-who">
          {named ? (
            <div className="avatar" style={{ width: 30, height: 30, fontSize: 14, background: post.color || "var(--card-2)" }}>
              {(profile.name || "?").slice(0, 1).toUpperCase()}
            </div>
          ) : (
            <div className="avatar anon">🙂</div>
          )}
          <div>
            <div className="post-nm">{named ? profile.name : t("someone")}</div>
            <div className="post-sub">{catLabel(cat, lang) + " · " + relTime(daysAgo, lang, t)}</div>
          </div>
          {isMine && (
            <button
              className="chip"
              style={{ marginLeft: "auto" }}
              onClick={() => updateProfile({ commStyle: named ? "anon" : "named" })}
            >
              {named ? t("styleAnon") : t("styleNamed")}
            </button>
          )}
        </div>
        <div className="post-cap">{post.text}</div>
        <div className="post-foot">
          <span className="post-min">{"⏱ " + fmtHours(post.minutes) + " · " + post.hobbyName}</span>
          {!isMine && (
            <button className="idea-add" onClick={act}>{already ? t("logYours") : t("startThis")}</button>
          )}
        </div>
      </div>
    </div>
  );
}
