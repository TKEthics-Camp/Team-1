import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "./store/StoreContext";
import { useAuth } from "./store/AuthContext";
import { useI18n } from "./i18n/I18nContext";
import { useReminderTimers } from "./lib/useReminderTimers";
import { UIProvider, useUI } from "./ui/UIContext";
import { DEFAULT_THEME } from "./lib/constants";
import { useResolvedTheme } from "./lib/useResolvedTheme";
import AuthFlow from "./components/auth/AuthFlow";
import Onboarding from "./components/onboarding/Onboarding";
import HomeScreen from "./components/home/HomeScreen";
import EducatorDashboard from "./components/home/EducatorDashboard";
import InterestScreen from "./components/interest/InterestScreen";
import PublicInterestScreen from "./components/interest/PublicInterestScreen";
import ExploreScreen from "./components/explore/ExploreScreen";
import ProfileScreen from "./components/profile/ProfileScreen";
import MarketScreen from "./components/market/MarketScreen";
import BottomNav from "./components/shared/BottomNav";
import SheetHost from "./components/sheets/SheetHost";
import PhotoViewer from "./components/interest/PhotoViewer";
import UndoToast from "./components/shared/UndoToast";
import Toast from "./components/shared/Toast";

export default function App() {
  const { loading, profile, interests, entries, photos, clearAllData } = useStore();
  const { session, loading: authLoading, user } = useAuth();
  const { lang, setLang, nameOf, t } = useI18n();
  const syncedLang = useRef(false);
  const lastUserId = useRef(null);
  const resolvedTheme = useResolvedTheme((profile && profile.theme) || DEFAULT_THEME);

  useReminderTimers(interests, entries, photos, lang, nameOf, t);

  // syncedLang latches so a later manual toggle isn't stomped by the profile
  // it came from. It has to unlatch when the account changes, though: left
  // set, the previous user's language stayed on screen through sign-out and
  // the next sign-in, and the incoming profile could never correct it — which
  // is how logging in landed you in Chinese. Signing out goes back to the
  // default rather than keeping whoever-was-here-last's choice.
  const langUser = useRef(null);
  useEffect(() => {
    const id = user ? user.id : null;
    if (langUser.current === id) return;
    langUser.current = id;
    syncedLang.current = false;
    if (!id) setLang("en");
  }, [user, setLang]);

  useEffect(() => {
    if (!syncedLang.current && profile && profile.lang) {
      setLang(profile.lang);
      syncedLang.current = true;
    }
  }, [profile, setLang]);

  // A device's local cache belongs to whoever's signed in. If someone signs
  // out (shared computer, different student next), wipe the local cache so
  // the next login on this device doesn't inherit the previous user's data —
  // there's no per-user sync yet, so this is the only thing preventing a leak.
  useEffect(() => {
    if (lastUserId.current && !user) clearAllData();
    lastUserId.current = user ? user.id : null;
  }, [user, clearAllData]);

  if (loading || authLoading) return null;

  return (
    <div className="stage" data-theme={resolvedTheme}>
      <div className="app">
        {!session ? (
          <AuthFlow />
        ) : profile ? (
          <BrowserRouter basename={import.meta.env.BASE_URL}>
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
  const navigate = useNavigate();
  const { profile } = useStore();
  const { sheet, viewer, closeSheet, closeViewer, openSheet } = useUI();

  // Escape closes whatever's open, the same as tapping the backdrop —
  // useful on a keyboard/desktop where there's no "outside" to tap.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== "Escape") return;
      if (viewer) closeViewer();
      else if (sheet) closeSheet();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sheet, viewer, closeSheet, closeViewer]);

  // RoutedShell only mounts once per "login" — on first load with an
  // existing profile, or right after onboarding finishes. Whatever the
  // address bar happened to be showing (a leftover route from before the
  // page reloaded, or from onboarding running with no router underneath
  // it to control), always land on Home instead of wherever that was.
  useEffect(() => {
    navigate("/", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigating between screens always drops any open sheet/viewer, matching
  // the original app's go() helper.
  useEffect(() => {
    closeSheet();
    closeViewer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // PublicInterestScreen's back arrow lands here carrying instructions to
  // reopen the userProfile sheet it was tapped into from — declared after
  // (and separately from) the effect above so it re-opens whatever that one
  // just closed, instead of the two racing within the same render.
  useEffect(() => {
    if (location.state && location.state.openUserProfile) {
      openSheet("userProfile", location.state.openUserProfile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const hideNav = location.pathname.startsWith("/user/");

  return (
    <>
      <Routes>
        <Route path="/" element={profile.accountType === "org" ? <EducatorDashboard /> : <HomeScreen />} />
        <Route path="/interest/:id" element={<InterestScreen />} />
        <Route path="/user/:userId/interest/:interestId" element={<PublicInterestScreen />} />
        <Route path="/explore" element={<ExploreScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/market" element={<MarketScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideNav && <BottomNav />}
      {sheet && <SheetHost />}
      {viewer && <PhotoViewer />}
      <UndoToast />
      <Toast />
    </>
  );
}
