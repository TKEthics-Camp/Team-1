import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useStore } from "./store/StoreContext";
import { useI18n } from "./i18n/I18nContext";
import { useReminderTimers } from "./lib/useReminderTimers";
import { UIProvider, useUI } from "./ui/UIContext";
import { DEFAULT_THEME } from "./lib/constants";
import Onboarding from "./components/onboarding/Onboarding";
import HomeScreen from "./components/home/HomeScreen";
import InterestScreen from "./components/interest/InterestScreen";
import ExploreScreen from "./components/explore/ExploreScreen";
import ProfileScreen from "./components/profile/ProfileScreen";
import MarketScreen from "./components/market/MarketScreen";
import SavedScreen from "./components/saved/SavedScreen";
import BottomNav from "./components/shared/BottomNav";
import SheetHost from "./components/sheets/SheetHost";
import PhotoViewer from "./components/interest/PhotoViewer";

export default function App() {
  const { loading, profile, interests } = useStore();
  const { lang, setLang, nameOf, t } = useI18n();
  const syncedLang = useRef(false);

  useReminderTimers(interests, lang, nameOf, t);

  useEffect(() => {
    if (!syncedLang.current && profile && profile.lang) {
      setLang(profile.lang);
      syncedLang.current = true;
    }
  }, [profile, setLang]);

  if (loading) return null;

  return (
    <div className="stage" data-theme={(profile && profile.theme) || DEFAULT_THEME}>
      <div className="app">
        {profile ? (
          <BrowserRouter>
            <UIProvider>
              <RoutedShell />
            </UIProvider>
          </BrowserRouter>
        ) : (
          <Onboarding />
        )}
      </div>
    </div>
  );
}

function RoutedShell() {
  const location = useLocation();
  const { sheet, viewer, closeSheet, closeViewer } = useUI();
  const showNav = !location.pathname.startsWith("/saved");

  // Navigating between screens always drops any open sheet/viewer, matching
  // the original app's go() helper.
  useEffect(() => {
    closeSheet();
    closeViewer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/interest/:id" element={<InterestScreen />} />
        <Route path="/explore" element={<ExploreScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/market" element={<MarketScreen />} />
        <Route path="/saved/:id" element={<SavedScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showNav && <BottomNav />}
      {sheet && <SheetHost />}
      {viewer && <PhotoViewer />}
    </>
  );
}
