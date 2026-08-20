import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import SfHead from "./SfHead";

// Last stop before the garden. The Figma asks for Light / Dark / System
// rather than the eight colour themes, so each choice maps onto an existing
// theme — no new theming model, and the colour themes are still all there
// under Me → theme. A real dark mode is separate work; "Dark" picks the
// darkest theme the app currently has.
const LIGHT_THEME = "marshmallow";
const DARK_THEME = "midnight";

function systemTheme() {
  const dark = typeof window !== "undefined"
    && window.matchMedia
    && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return dark ? DARK_THEME : LIGHT_THEME;
}

const LOOKS = [
  ["light", "☀️", "sfLookLight"],
  ["dark", "🌑", "sfLookDark"],
  ["system", "🖥️", "sfLookSystem"],
];

export default function LookStep({ value, setTheme, onEnter }) {
  const { t } = useI18n();
  const [look, setLook] = useState("light");

  function pick(id) {
    setLook(id);
    setTheme(id === "light" ? LIGHT_THEME : id === "dark" ? DARK_THEME : systemTheme());
  }

  // Apply as they tap so entering the garden doesn't jump.
  useEffect(() => {
    const stage = document.querySelector(".stage");
    if (stage && value) stage.setAttribute("data-theme", value);
  }, [value]);

  return (
    <>
      <SfHead>{t("sfLookTitle")}</SfHead>

      <div className="sf-options">
        {LOOKS.map(([id, ico, key]) => (
          <button
            key={id}
            type="button"
            className="sf-pill sf-look"
            aria-pressed={look === id ? "true" : "false"}
            onClick={() => pick(id)}
          >
            <span className="sf-look-ico" aria-hidden="true">{ico}</span>
            {t(key)}
          </button>
        ))}
      </div>

      <div className="sf-grow" />
      <div className="sf-foot">
        <button className="sf-btn" onClick={onEnter}>{t("sfContinue")}</button>
      </div>
    </>
  );
}
