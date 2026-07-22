import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { communityPosts } from "../../lib/community";
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

      {posts.map((post) => <PostCard key={post.seed} post={post} style={style} />)}
    </>
  );
}
