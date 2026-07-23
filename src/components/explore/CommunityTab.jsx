import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { PALETTE } from "../../lib/constants";
import { communityPosts } from "../../lib/community";
import PersonAvatar from "../shared/PersonAvatar";
import PostCard from "./PostCard";

export default function CommunityTab() {
  const { t } = useI18n();
  const { profile, updateProfile } = useStore();
  const style = (profile && profile.commStyle) || "anon";
  const posts = communityPosts();

  const options = [
    ["anon", t("styleAnon")],
    ["named", t("styleNamed")],
  ];

  return (
    <>
      <div className="safe-note">
        <span aria-hidden="true">🌱</span>
        <span>{t("commNote")}</span>
      </div>

      <div className="row">
        <span className="label">{t("styleLabel")}</span>
        <div className="grow">
          <div className="seg">
            {options.map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={style === key ? "true" : "false"}
                onClick={() => updateProfile({ commStyle: key })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* A live preview of the user's own choice — not other people's posts,
          which always show named (see PostCard). */}
      <div className="idea">
        {style === "named" ? (
          <div style={{ flex: "none" }}>
            <PersonAvatar color={(profile && profile.color) || PALETTE[0]} avatar={profile && profile.avatar} size={40} />
          </div>
        ) : (
          <div className="avatar anon">🙂</div>
        )}
        <div className="grow">
          <div className="idea-nm">{style === "named" ? profile && profile.name : t("someone")}</div>
          <div className="idea-cat">{t("styleNote")}</div>
        </div>
      </div>

      {posts.map((post) => <PostCard key={post.seed} post={post} />)}
    </>
  );
}
