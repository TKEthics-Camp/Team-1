import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "./i18n/I18nContext";
import { StoreProvider } from "./store/StoreContext";
import { AuthProvider } from "./store/AuthContext";
import App from "./App";
import "./styles/index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <I18nProvider>
      <AuthProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </AuthProvider>
    </I18nProvider>
  </StrictMode>
);

// Only in production: the dev server's own hot-reload already fights a
// service worker for control of the page, and there's nothing built at
// /sw.js in dev anyway.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
