import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import SfHead from "./SfHead";

// Last stop before the garden. Stores the choice as-is — "white", "black",
// or literally "system" — rather than resolving System once here, so it
// keeps following the OS after onboarding via lib/useResolvedTheme.
const LOOKS = [
  ["white", "☀️", "sfLookLight"],
  ["black", "🌑", "sfLookDark"],
  ["system", "🖥️", "sfLookSystem"],
];

function resolveForPreview(id) {
  if (id !== "system") return id;
  const dark = typeof window !== "undefined"
    && window.matchMedia
    && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return dark ? "black" : "white";
}

export default function LookStep({ value, setTheme, onEnter }) {
  const { t } = useI18n();
  const [look, setLook] = useState(value);

  function pick(id) {
    setLook(id);
    setTheme(id);
  }

  // Apply as they tap so entering the garden doesn't jump. A one-shot
  // resolve is enough here — lib/useResolvedTheme takes over live tracking
  // for the rest of the app once onboarding hands off to it.
  useEffect(() => {
    const stage = document.querySelector(".stage");
    if (stage && value) stage.setAttribute("data-theme", resolveForPreview(value));
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
