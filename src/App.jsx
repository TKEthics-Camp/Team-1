import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "./store/StoreContext";
import { useAuth } from "./store/AuthContext";
import { useI18n } from "./i18n/I18nContext";
import { useReminderTimers } from "./lib/useReminderTimers";
import { listenForReminderTaps, takeOpenPath, onOpenPath } from "./lib/notifications";
import { UIProvider, useUI } from "./ui/UIContext";
import { DEFAULT_THEME } from "./lib/constants";
import { useResolvedTheme } from "./lib/useResolvedTheme";
import { useBadgeWatcher } from "./lib/useBadgeWatcher";
import AuthFlow from "./components/auth/AuthFlow";
import GuardianConsentPage from "./components/consent/GuardianConsentPage";
import PendingConsentScreen from "./components/consent/PendingConsentScreen";
import AgeRequiredScreen from "./components/consent/AgeRequiredScreen";
import PolicyScreen from "./components/policy/PolicyScreen";
import SupportScreen from "./components/policy/SupportScreen";
import { guardianTokenFromLocation, policyFromLocation } from "./lib/guardianLink";
import { myConsentStatus, refreshConsentState } from "./lib/remote";
import { forgetConsentStatus, signupGateSettled } from "./lib/useConsentStatus";
import { clearSession } from "./lib/sessionTimer";
import HomeScreen from "./components/home/HomeScreen";
import BottomNav from "./components/shared/BottomNav";
import ErrorBoundary from "./components/shared/ErrorBoundary";

// Split at the route boundary. AuthFlow and HomeScreen stay eager because
// one of them is always the first paint — lazy-loading those would only
// trade bytes for a blank frame. Everything below is reached by a tap, by
// which point the chunk has had the whole session to arrive.
const Onboarding = lazy(() => import("./components/onboarding/Onboarding"));
const EducatorDashboard = lazy(() => import("./components/home/EducatorDashboard"));
const InterestScreen = lazy(() => import("./components/interest/InterestScreen"));
const PublicInterestScreen = lazy(() => import("./components/interest/PublicInterestScreen"));
const ExploreScreen = lazy(() => import("./components/explore/ExploreScreen"));
const JournalScreen = lazy(() => import("./components/journal/JournalScreen"));
const ProfileScreen = lazy(() => import("./components/profile/ProfileScreen"));
const MarketScreen = lazy(() => import("./components/market/MarketScreen"));
const ModerationScreen = lazy(() => import("./components/moderation/ModerationScreen"));
const SheetHost = lazy(() => import("./components/sheets/SheetHost"));
const PhotoViewer = lazy(() => import("./components/interest/PhotoViewer"));
import UndoToast from "./components/shared/UndoToast";
import Toast from "./components/shared/Toast";
import SyncStatusBadge from "./components/shared/SyncStatusBadge";
import SessionPill from "./components/shared/SessionPill";
import LogCelebration from "./components/shared/LogCelebration";

export default function App() {
  const { loading, profile, profileCheck, interests, entries, photos, clearAllData } = useStore();
  const { session, loading: authLoading, user } = useAuth();
  const [consent, setConsent] = useState(undefined); // undefined = not asked yet
  const { lang, setLang, nameOf, t } = useI18n();
  const appliedLang = useRef(null);
  const lastUserId = useRef(null);
  const resolvedTheme = useResolvedTheme((profile && profile.theme) || DEFAULT_THEME);

  useReminderTimers(interests, entries, photos, lang, nameOf, t);
  // Registered as early as possible: a reminder tapped while the app was
  // closed is delivered once something is listening.
  useEffect(() => listenForReminderTaps(), []);

  // appliedLang is the profile language last put on screen, so this only
  // acts when the profile's language actually changes — on load, or when
  // sign-in sync brings one chosen on another device. It used to latch after
  // the first one, which left that second case showing the old language
  // while the profile said the new one. A manual toggle changes both at once
  // (see LangToggle), so it is never stomped.
  //
  // It has to reset when the account changes, though: left set, the previous
  // user's language stayed on screen through sign-out and the next sign-in,
  // and the incoming profile could never correct it — which is how logging in
  // landed you in Chinese. Signing out goes back to the default rather than
  // keeping whoever-was-here-last's choice.
  const langUser = useRef(null);
  useEffect(() => {
    const id = user ? user.id : null;
    if (langUser.current === id) return;
    langUser.current = id;
    appliedLang.current = null;
    if (!id) setLang("en");
  }, [user, setLang]);

  // Only this account's own profile may set the language. A browser can
  // still be holding the previous person's cached profile when someone new
  // signs up — its owner is checked and it is cleared during sign-in sync,
  // but that comes a moment later, after this has already run. Taken at
  // face value, a new account inherited whatever language the last person
  // here used. A profile with no userId yet is a cache from before that
  // field existed; sign-in sync stamps it, and this runs again when it does.
  useEffect(() => {
    if (!profile || !profile.lang || !user) return;
    if (profile.userId !== user.id || appliedLang.current === profile.lang) return;
    appliedLang.current = profile.lang;
    setLang(profile.lang);
  }, [profile, user, setLang]);

  // A device's local cache belongs to whoever's signed in. If someone signs
  // out (shared computer, different student next), wipe the local cache so
  // the next login on this device doesn't inherit the previous user's data —
  // there's no per-user sync yet, so this is the only thing preventing a leak.
  useEffect(() => {
    // Same reasoning as clearAllData: the next student on a shared computer
    // must not inherit anything of the previous one's, and consent state
    // decides what whole screens do.
    // A running session timer goes too: it names one of the previous
    // student's hobbies.
    if (lastUserId.current && !user) { clearAllData(); forgetConsentStatus(); clearSession(); }
    lastUserId.current = user ? user.id : null;
  }, [user, clearAllData]);

  // Asked once per signed-in session. refreshConsentState is what notices a
  // fourteenth birthday, and it deliberately does not unlock anything — see
  // migration 20260918000000.
  useEffect(() => {
    let cancelled = false;
    if (!user) { setConsent(null); return; }
    (async () => {
      await signupGateSettled();
      await refreshConsentState();
      const status = await myConsentStatus();
      if (!cancelled) setConsent(status);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // The guardian is not a user of this app and has no session, so their page
  // is resolved from the URL before the auth gate rather than inside the
  // router — the router only mounts once someone is signed in with a
  // profile, which a parent following a link never is.
  // Same reasoning as the consent link below: a parent reading the policy
  // has no account, so this is resolved before the auth gate.
  const policy = policyFromLocation();
  if (policy) {
    // Reached by a full navigation (window.location.href from Me, or a
    // direct link a guardian followed with no session at all), not through
    // the router — so there is no in-app screen to pop back to. Without
    // onBack, neither screen renders a back button at all (see their own
    // `{onBack ? ... : <span/>}`), and on a PWA in standalone display mode
    // there is no browser chrome either — nothing to exit with. Navigating
    // to the base URL works the same way regardless of how this was
    // reached: signed-in users land back in the app, and a guardian with no
    // session lands on sign-in, same as opening the link fresh.
    const exitToApp = () => { window.location.href = import.meta.env.BASE_URL || "/"; };
    return (
      <div className="stage" data-theme={resolvedTheme}>
        <div className="app">
          {policy === "support"
            ? <SupportScreen onBack={exitToApp} />
            : <PolicyScreen which={policy} onBack={exitToApp} />}
        </div>
      </div>
    );
  }

  const guardianToken = guardianTokenFromLocation();
  if (guardianToken) {
    return (
      <div className="stage" data-theme={resolvedTheme}>
        <div className="app"><GuardianConsentPage token={guardianToken} /></div>
      </div>
    );
  }

  if (loading || authLoading) return null;

  return (
    <div className="stage" data-theme={resolvedTheme}>
      <div className="app">
        {!session ? (
          <AuthFlow />
        ) : consent === undefined ? (
          // Held rather than guessed: showing the app for a frame and then
          // yanking it away is worse than a blank one, and this only lasts a
          // single round trip.
          <div className="view" />
        ) : consent && consent.state === "age_required" ? (
          <AgeRequiredScreen />
        ) : consent && (consent.state === "pending" || consent.state === "withdrawn") ? (
          <PendingConsentScreen withdrawn={consent.state === "withdrawn"} />
        ) : profile ? (
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <UIProvider>
              <RoutedShell />
            </UIProvider>
          </BrowserRouter>
        ) : profileCheck === "failed" ? (
          <ProfileCheckFailed />
        ) : profileCheck !== "done" ? (
          // A device with no profile on it may belong to a returning
          // student — sign-in sync is still asking the server. Showing
          // Onboarding meanwhile flashed the start flow at them, and on a
          // slow answer let them start it over the top of their account.
          <div className="view" />
        ) : (
          <Suspense fallback={<div className="view" />}><Onboarding /></Suspense>
        )}
      </div>
    </div>
  );
}

// Signed in, nothing on this device, and the server couldn't be asked
// whether this account has been set up. Neither guess is safe, so it asks
// to try again — on its own as soon as the connection comes back.
function ProfileCheckFailed() {
  const { t } = useI18n();
  const { retryProfileCheck } = useStore();
  const { signOut } = useAuth();

  useEffect(() => {
    window.addEventListener("online", retryProfileCheck);
    return () => window.removeEventListener("online", retryProfileCheck);
  }, [retryProfileCheck]);

  return (
    <div className="view" style={{ alignItems: "center", justifyContent: "center", textAlign: "center", gap: 12 }}>
      <p className="sub">{t("profileLoadFailed")}</p>
      <button className="btn" onClick={retryProfileCheck}>{t("syncRetry")}</button>
      <button className="btn2" onClick={() => signOut()}>{t("logOut")}</button>
    </div>
  );
}

function RoutedShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, interests, entries, photos, updateProfile } = useStore();
  const { sheet, viewer, closeSheet, closeViewer, openSheet, showToast } = useUI();
  const { t } = useI18n();

  // Lives here rather than in App: it needs showToast, and UIProvider only
  // wraps this half of the tree.
  useBadgeWatcher({ profile, interests, entries, photos, updateProfile, showToast, t });

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
  // it to control), land on Home instead of wherever that was — unless a
  // tapped reminder opened the app, in which case go where it points.
  useEffect(() => {
    navigate(takeOpenPath() || "/", { replace: true });
    return onOpenPath((path) => navigate(path));
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
      {/* Keyed on the path so moving to another tab clears a crashed screen.
          The root boundary in main.jsx still catches anything outside this —
          a provider blowing up, say — where reloading really is the only way
          out. */}
      <ErrorBoundary inline key={location.pathname}>
        {/* An empty .view holds the frame's shape while a chunk lands, so
            switching tabs doesn't collapse the layout for a frame. */}
        <Suspense fallback={<div className="view" />}>
        <Routes>
          <Route path="/" element={profile.accountType === "org" ? <EducatorDashboard /> : <HomeScreen />} />
          <Route path="/interest/:id" element={<InterestScreen />} />
          <Route path="/user/:userId/interest/:interestId" element={<PublicInterestScreen />} />
          {/* The whole journal and its insights. An educator has neither. */}
          <Route path="/journal" element={profile.accountType === "org" ? <Navigate to="/" replace /> : <JournalScreen />} />
          <Route path="/explore" element={<ExploreScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/market" element={<MarketScreen />} />
          {/* Reachable only by an account listed in public.moderators. The
              server refuses every call behind this screen regardless, so
              the route existing is not itself access. */}
          <Route path="/reports" element={<ModerationScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </ErrorBoundary>
      {!hideNav && <BottomNav />}
      <Suspense fallback={null}>
        {sheet && <SheetHost />}
        {viewer && <PhotoViewer />}
      </Suspense>
      {/* Before the toasts, which sit above the pill while one is running. */}
      <SessionPill />
      <UndoToast />
      <Toast />
      <SyncStatusBadge />
      <LogCelebration />
    </>
  );
}
