import { useEffect, useState } from "react";

function prefersDark() {
  return typeof window !== "undefined"
    && window.matchMedia
    && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// "system" isn't a real data-theme value — it means "whichever of White or
// Black matches the OS right now," and stays live if the OS preference
// changes while the app is open. Anything else (white, black) passes
// through unchanged.
export function useResolvedTheme(themeId) {
  const [dark, setDark] = useState(prefersDark);

  useEffect(() => {
    if (themeId !== "system" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => setDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [themeId]);

  if (themeId !== "system") return themeId;
  return dark ? "black" : "white";
}
