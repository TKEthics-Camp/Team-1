import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { db } from "../db/db";
import { createLocalAccount, verifyLocalAccount } from "../lib/localAuth";

const AuthCtx = createContext(null);

// DEBUG ONLY: VITE_DEBUG_SKIP_AUTH lets local dev skip the real login screen
// entirely, landing straight in the app under a fake account. Only ever set
// in a local .env.local (gitignored) — never in a deployed environment.
// import.meta.env.DEV guard: this can never activate in a production build,
// even if the env var leaks into a deployed environment.
const DEBUG_SKIP_AUTH = import.meta.env.DEV && import.meta.env.VITE_DEBUG_SKIP_AUTH === "true";
const DEBUG_SESSION = { user: { id: "00000000-0000-0000-0000-000000000001", username: "debug", isDebug: true } };

// Plan A: accounts are local to this device — username + password, no email,
// no backend (see localAuth.js). Whoever's logged in is remembered here so a
// page reload doesn't sign them out; signing out clears it. The `isLocal`
// flag on the resulting user is what tells StoreContext/Onboarding to skip
// every real-backend call, the same way `isDebug` already does — neither of
// these users has a row in a database that doesn't exist yet.
const SESSION_KEY = "forestLocalSessionUsername";

function toUser(account) {
  return {
    id: account.id, username: account.displayName || account.username, isLocal: true,
    accountType: account.accountType || "individual", email: account.email || null,
  };
}

export function AuthProvider({ children }) {
  const { t } = useI18n();
  const [session, setSession] = useState(DEBUG_SKIP_AUTH ? DEBUG_SESSION : undefined); // undefined = not checked yet, null = signed out
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (DEBUG_SKIP_AUTH) return;
    const savedUsername = localStorage.getItem(SESSION_KEY);
    if (!savedUsername) { setSession(null); return; }
    db.accounts.get(savedUsername).then((account) => {
      setSession(account ? { user: toUser(account) } : null);
    });
  }, []);

  const actions = useMemo(() => ({
    async signUp(username, password, extra) {
      setAuthError(null);
      const result = await createLocalAccount(username, password, extra);
      if (!result.ok) {
        setAuthError(result.reason === "taken" ? t("authUsernameTaken") : t("authUsernameRequired"));
        return { ok: false };
      }
      localStorage.setItem(SESSION_KEY, result.account.username);
      setSession({ user: toUser(result.account) });
      return { ok: true, needsConfirmation: false };
    },
    async signIn(username, password) {
      setAuthError(null);
      const result = await verifyLocalAccount(username, password);
      if (!result.ok) {
        setAuthError(result.reason === "notFound" ? t("authNoAccount") : t("authWrongPassword"));
        return { ok: false };
      }
      localStorage.setItem(SESSION_KEY, result.account.username);
      setSession({ user: toUser(result.account) });
      return { ok: true };
    },
    async signOut() {
      localStorage.removeItem(SESSION_KEY);
      setSession(null);
    },
    clearAuthError() {
      setAuthError(null);
    },
  }), [t]);

  const value = useMemo(
    () => ({ session, user: session ? session.user : null, loading: session === undefined, authError, ...actions }),
    [session, authError, actions]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
