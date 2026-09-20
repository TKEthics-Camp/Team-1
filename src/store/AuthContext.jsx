import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthCtx = createContext(null);

// DEBUG ONLY: VITE_DEBUG_SKIP_AUTH lets local dev skip the real login screen
// entirely, landing straight in the app under a fake account. Only ever set
// in a local .env.local (gitignored) — never in a deployed environment.
// import.meta.env.DEV guard: this can never activate in a production build,
// even if the env var leaks into a deployed environment.
const DEBUG_SKIP_AUTH = import.meta.env.DEV && import.meta.env.VITE_DEBUG_SKIP_AUTH === "true";
// isDebug tells StoreContext to skip all real Supabase sync for this fake
// user — those calls aren't authenticated and would just fail RLS.
const DEBUG_SESSION = { user: { id: "00000000-0000-0000-0000-000000000001", email: "debug@local.test", isDebug: true } };

export function AuthProvider({ children }) {
  const [session, setSession] = useState(DEBUG_SKIP_AUTH ? DEBUG_SESSION : undefined); // undefined = not checked yet, null = signed out
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (DEBUG_SKIP_AUTH) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  const actions = useMemo(() => ({
    // `metadata` (username, accountType) rides in Supabase's user_metadata —
    // it's how Onboarding knows who's signing up without asking again, and
    // survives a page reload since it's part of the session/JWT itself.
    async signUp(email, password, metadata) {
      setAuthError(null);
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: metadata } });
      if (error) { setAuthError(error.message); return { ok: false }; }
      // With email confirmation on, signUp succeeds but returns no session yet.
      return { ok: true, needsConfirmation: !data.session, userId: data.user ? data.user.id : null };
    },
    async signIn(email, password) {
      setAuthError(null);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setAuthError(error.message); return { ok: false }; }
      return { ok: true };
    },
    async signOut() {
      await supabase.auth.signOut();
    },
    // Re-authenticates before changing anything. updateUser() on its own
    // would let whoever is holding an already-unlocked phone change the
    // password and lock the owner out of their own garden — and a shared
    // or borrowed phone is the normal case for these students, not the
    // edge case. Knowing the current password is the gate.
    //
    // The email is read back from the session rather than closed over, so
    // this can't go stale inside a memo that never re-runs. Students don't
    // have a real address; theirs is the one derived from their username
    // (see lib/syntheticEmail.js), which is exactly what they signed in
    // with, so the same re-auth works for both account types.
    async changePassword(currentPassword, newPassword) {
      const { data: current } = await supabase.auth.getUser();
      const email = current && current.user && current.user.email;
      if (!email) return { ok: false, reason: "error" };

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email, password: currentPassword,
      });
      if (reauthError) return { ok: false, reason: "wrong" };

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        // Deliberately not logging the error object here the way the rest
        // of the app does — this is the one call whose payload is a
        // password.
        console.error("Password change failed:", error.message);
        return { ok: false, reason: "error" };
      }
      return { ok: true };
    },
    clearAuthError() {
      setAuthError(null);
    },
  }), []);

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
