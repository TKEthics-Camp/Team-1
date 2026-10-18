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

// The iPhone's own text size (Settings › Accessibility › Larger Text).
// A web view does not pass it to pixel-sized CSS, but it does resolve the
// system "body" font to the size the person chose, 17px at the default.
// The whole app is scaled by how far that is from 17, never smaller than
// as designed and at most a third larger, so the layout still holds.
// native.css divides full-screen heights by the same factor.
function followSystemTextSize() {
  const probe = document.createElement("span");
  probe.style.font = "-apple-system-body";
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  document.body.appendChild(probe);
  const size = parseFloat(getComputedStyle(probe).fontSize) || 17;
  probe.remove();
  const scale = Math.min(1.35, Math.max(1, size / 17));
  document.documentElement.style.setProperty("--text-scale", String(scale));
  document.body.style.zoom = scale === 1 ? "" : String(scale);
}
if (native) {
  followSystemTextSize();
  // Changed in Settings while the app was in the background.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") followSystemTextSize();
  });
}

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
