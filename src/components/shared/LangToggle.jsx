import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";

export default function LangToggle() {
  const { lang, setLang } = useI18n();
  const { profile, setLangOnProfile } = useStore();

  function toggle() {
    const next = lang === "en" ? "zh" : "en";
    setLang(next);
    if (profile) setLangOnProfile(next);
  }

  return (
    <button
      className="lang"
      aria-label={lang === "en" ? "切换到中文" : "Switch to English"}
      onClick={toggle}
    >
      {lang === "en" ? "中文" : "EN"}
    </button>
  );
}
