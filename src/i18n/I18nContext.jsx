import { createContext, useContext, useMemo, useState } from "react";
import { STR } from "./strings";

const I18nCtx = createContext(null);

// "1 entry", not "1 entries". Chinese measure words don't inflect.
const SINGULARS = { entries: "entry1", photos: "photo1", orbsCount: "orb1", publicCount: "publicCount1" };

export function I18nProvider({ children }) {
  const [lang, setLang] = useState("en");

  const value = useMemo(() => {
    function t(k) {
      const v = STR[k];
      return v ? v[lang === "en" ? 0 : 1] : k;
    }
    function nOf(n, key) {
      if (lang !== "en") return t(key);
      return n === 1 && SINGULARS[key] ? t(SINGULARS[key]) : t(key);
    }
    function nameOf(it) {
      return lang === "en" ? it.name : it.nameZh || it.name;
    }
    return { lang, setLang, t, nOf, nameOf };
  }, [lang]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
