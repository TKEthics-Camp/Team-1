import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { PALETTE } from "../../lib/constants";
import { fmtHours } from "../../lib/derived";
import { haveHobby, ideaColor } from "../../lib/explore";
import { relTime } from "../../lib/community";
import PersonAvatar from "../shared/PersonAvatar";
import ReportMenu from "../shared/ReportMenu";

// One real shared moment. The author's name opens their profile — which is
// where their public trees and entries live; the feed itself only ever shows
// what was explicitly posted.
export default function PostCard({ post, onHide, onBlocked }) {
  const { t, lang } = useI18n();
  const { interests, profile } = useStore();
  const { openSheet } = useUI();
  const isOrg = profile && profile.accountType === "org";
  const has = haveHobby(interests, [post.hobby, post.hobby]);
  const days = Math.max(0, Math.round((Date.now() - post.createdAt) / 86400000));

  function act() {
    const mine = interests.find((it) => it.name.toLowerCase() === post.hobby.toLowerCase());
    if (mine) openSheet("entry", mine.id);
    else openSheet("orb", { preset: { name: post.hobby, nameZh: post.hobby, color: PALETTE[ideaColor(post.hobby)] } });
  }

  return (
    <div className="post">
      <div className="post-body">
        <div className="post-who">
          <button
            type="button"
            className="post-author"
            onClick={() => openSheet("userProfile", { userId: post.authorId, displayName: post.authorName, avatar: post.authorAvatar })}
          >
            <PersonAvatar avatar={post.authorAvatar} size={30} />
            <span>
              <span className="post-nm">{post.authorName}</span>
              <span className="post-sub">{post.hobby + " · " + relTime(days, lang, t)}</span>
            </span>
          </button>
          <ReportMenu
            targetType="entry"
            targetId={post.id}
            authorId={post.authorId}
            label={t("postOptions")}
            onReported={onHide}
            onBlocked={onBlocked}
          />
        </div>

        {post.text && <div className="post-cap">{post.text}</div>}

        <div className="post-foot">
          <span className="post-min">{"⏱ " + fmtHours(post.minutes)}</span>
          {!isOrg && <button className="idea-add" onClick={act}>{has ? t("logYours") : t("startThis")}</button>}
        </div>
      </div>
    </div>
  );
}
