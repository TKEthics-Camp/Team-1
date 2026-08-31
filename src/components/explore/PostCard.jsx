import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useAuth } from "../../store/AuthContext";
import { useUI } from "../../ui/UIContext";
import { PALETTE } from "../../lib/constants";
import { fmtHours } from "../../lib/derived";
import { haveHobby, ideaColor } from "../../lib/explore";
import { relTime } from "../../lib/community";
import { blockUser, reportContent } from "../../lib/remote";
import PersonAvatar from "../shared/PersonAvatar";

const REPORT_REASONS = ["reportSpam", "reportMean", "reportUnsafe", "reportOther"];

// One real shared moment. The author's name opens their profile — which is
// where their public trees and entries live; the feed itself only ever shows
// what was explicitly posted.
export default function PostCard({ post, onHide, onBlocked }) {
  const { t, lang } = useI18n();
  const { interests, profile } = useStore();
  const { user } = useAuth();
  const { openSheet, showToast } = useUI();
  const [menu, setMenu] = useState(null); // null | "menu" | "report"
  const isOrg = profile && profile.accountType === "org";
  const has = haveHobby(interests, [post.hobby, post.hobby]);
  const days = Math.max(0, Math.round((Date.now() - post.createdAt) / 86400000));

  function act() {
    const mine = interests.find((it) => it.name.toLowerCase() === post.hobby.toLowerCase());
    if (mine) openSheet("entry", mine.id);
    else openSheet("orb", { preset: { name: post.hobby, nameZh: post.hobby, color: PALETTE[ideaColor(post.hobby)] } });
  }

  async function block() {
    setMenu(null);
    if (!user) return;
    // hide first — the row is already on screen, and waiting on the network
    // to remove something the user just asked to never see again reads badly
    onBlocked(post.authorId);
    const ok = await blockUser(user.id, post.authorId);
    showToast(ok ? t("blockedToast") : t("actionFailed"));
  }

  async function report(reasonKey) {
    setMenu(null);
    if (!user) return;
    onHide(post.id);
    const ok = await reportContent(user.id, "entry", post.id, reasonKey);
    showToast(ok ? t("reportedToast") : t("actionFailed"));
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
          <div className="post-menu-wrap">
            <button
              type="button"
              className="icon post-more"
              aria-label={t("postOptions")}
              aria-expanded={menu ? "true" : "false"}
              onClick={() => setMenu(menu ? null : "menu")}
            >
              ⋯
            </button>
            {menu === "menu" && (
              <div className="post-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => setMenu("report")}>{t("report")}</button>
                <button type="button" role="menuitem" className="danger" onClick={block}>{t("block")}</button>
              </div>
            )}
            {menu === "report" && (
              <div className="post-menu" role="menu">
                <div className="post-menu-head">{t("reportWhy")}</div>
                {REPORT_REASONS.map((r) => (
                  <button key={r} type="button" role="menuitem" onClick={() => report(r)}>{t(r)}</button>
                ))}
                <button type="button" role="menuitem" onClick={() => setMenu(null)}>{t("cancel")}</button>
              </div>
            )}
          </div>
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
