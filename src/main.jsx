import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "./i18n/I18nContext";
import { StoreProvider } from "./store/StoreContext";
import { AuthProvider } from "./store/AuthContext";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import App from "./App";
import "./styles/index.css";
import { Capacitor } from "@capacitor/core";

// Inside the iPhone app the layout fills the screen instead of drawing a
// phone-shaped card (styles/native.css). Set before the first render so
// there is no frame of the card first.
const native = Capacitor.isNativePlatform();
if (native) document.documentElement.classList.add("native");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <AuthProvider>
          <StoreProvider>
            <App />
          </StoreProvider>
        </AuthProvider>
      </I18nProvider>
    </ErrorBoundary>
  </StrictMode>
);

// Only in production: the dev server's own hot-reload already fights a
// service worker for control of the page, and there's nothing built at
// /sw.js in dev anyway.
// Nor in the iPhone app, which carries its files inside it and has nothing
// to cache offline.
if ("serviceWorker" in navigator && import.meta.env.PROD && !native) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
