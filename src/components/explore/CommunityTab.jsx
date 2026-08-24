import { communityPosts } from "../../lib/community";
import PostCard from "./PostCard";

export default function CommunityTab() {
  const posts = communityPosts();

  return (
    <>
      {posts.map((post) => <PostCard key={post.seed} post={post} />)}
    </>
  );
}
