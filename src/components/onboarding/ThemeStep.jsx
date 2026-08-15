import { useEffect } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { THEMES } from "../../lib/constants";

// Last stop before the garden: pick a look. We preview it live by setting the
// theme on the stage as they tap, so they see the real thing before entering.
export default function ThemeStep({ value: theme, setTheme, onEnter }) {
  const { t, lang } = useI18n();

  useEffect(() => {
    const stage = document.querySelector(".stage");
    if (stage && theme) stage.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <>
      <h2>{t("themePick")}</h2>
      <p>{t("themePickSub")}</p>

      <div className="scroll">
        <div className="themes">
          {THEMES.map((th) => (
            <button
              key={th.id}
              type="button"
              className="theme-btn"
              aria-pressed={theme === th.id ? "true" : "false"}
              onClick={() => setTheme(th.id)}
            >
              <span className="band">
                {th.sw.map((c, i) => <span key={i} style={{ background: c }} />)}
              </span>
              <span className="nm">{th.name[lang === "en" ? 0 : 1]}</span>
            </button>
          ))}
        </div>
      </div>

      <button className="btn" onClick={onEnter}>{t("enter")}</button>
    </>
  );
}
