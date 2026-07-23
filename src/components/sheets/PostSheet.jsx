import { useI18n } from "../../i18n/I18nContext";
import { useUI } from "../../ui/UIContext";
import Sheet from "../shared/Sheet";
import PostCard from "../explore/PostCard";

// Tapping a grid tile opens the full moment — same picture, caption, and
// "log yours / start this" CTA PostCard always had, just one tap deeper.
export default function PostSheet({ post }) {
  const { t } = useI18n();
  const { closeSheet } = useUI();
  if (!post) return null;

  return (
    <Sheet onClose={closeSheet}>
      <PostCard post={post} />
      <button className="btn2" onClick={closeSheet}>{t("close")}</button>
    </Sheet>
  );
}
