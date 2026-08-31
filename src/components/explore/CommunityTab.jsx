import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useAuth } from "../../store/AuthContext";
import { pullFeed } from "../../lib/remote";
import EmptyState from "../shared/EmptyState";
import PostCard from "./PostCard";

// Real posts from real accounts — entries whose author ticked "share to
// Explore". Nothing is fabricated here any more, so an empty feed is a real
// state (nobody has shared yet) rather than something to paper over with
// sample content.
export default function CommunityTab() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [posts, setPosts] = useState(null); // null = still loading
  const [gone, setGone] = useState([]);     // hidden locally the moment you block/report

  const load = useCallback(() => {
    if (!user) { setPosts([]); return; }
    let cancelled = false;
    pullFeed(user.id).then((rows) => { if (!cancelled) setPosts(rows); });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => load(), [load]);

  if (posts === null) return <div className="sub">{t("feedLoading")}</div>;

  const visible = posts.filter((p) => !gone.includes(p.id));
  if (!visible.length) {
    return <EmptyState text={t("feedEmpty")} />;
  }

  return (
    <>
      {visible.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onHide={(id) => setGone((g) => [...g, id])}
          onBlocked={(authorId) =>
            setGone((g) => [...g, ...posts.filter((p) => p.authorId === authorId).map((p) => p.id)])
          }
        />
      ))}
    </>
  );
}
