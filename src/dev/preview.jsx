import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "../i18n/I18nContext";
import { UIProvider, useUI } from "../ui/UIContext";
import HomeScreen from "../components/home/HomeScreen";
import ProfileScreen from "../components/profile/ProfileScreen";
import ExploreScreen from "../components/explore/ExploreScreen";
import InterestScreen from "../components/interest/InterestScreen";
import BottomNav from "../components/shared/BottomNav";
import SheetHost from "../components/sheets/SheetHost";
import Toast from "../components/shared/Toast";
import "../styles/index.css";

// A design preview: the app's real screens, fed sample data. Run with
//   npx vite --config vite.preview.config.js
// Nothing here ships — it is a separate entry with its own config.
function Shell() {
  const { sheet } = useUI();
  return (
    <>
      <Suspense fallback={<div className="view" />}>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/interest/:id" element={<InterestScreen />} />
          <Route path="/explore" element={<ExploreScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
        </Routes>
      </Suspense>
      <BottomNav />
      {sheet && <SheetHost />}
      <Toast />
    </>
  );
}

const theme = new URLSearchParams(location.search).get("theme") || "white";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <I18nProvider>
      <div className="stage" data-theme={theme}>
        <div className="app">
          <BrowserRouter basename="/preview.html">
            <UIProvider><Shell /></UIProvider>
          </BrowserRouter>
        </div>
      </div>
    </I18nProvider>
  </StrictMode>
);
