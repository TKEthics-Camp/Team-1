import { useI18n } from "../../i18n/I18nContext";
import { useUI } from "../../ui/UIContext";
import { scene } from "../../lib/community";
import { hobbyName } from "../../lib/explore";

// One square in the discover-style grid: just the picture. Tap it to open
// the full moment (caption, author, CTA) in a sheet.
export default function PostTile({ post }) {
  const { lang } = useI18n();
  const { openSheet } = useUI();
  const st = post.student;

  return (
    <button
      type="button"
      className="post-tile"
      aria-label={`${st.name[lang === "en" ? 0 : 1]} · ${hobbyName(post.hobby, lang)}`}
      onClick={() => openSheet("post", { post })}
      dangerouslySetInnerHTML={{ __html: scene(post.hobby[0], post.cat, post.seed) }}
    />
  );
}
