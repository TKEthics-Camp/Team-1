import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = not checked yet, null = signed out
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  const actions = useMemo(() => ({
    async signUp(email, password) {
      setAuthError(null);
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { setAuthError(error.message); return { ok: false }; }
      // With email confirmation on, signUp succeeds but returns no session yet.
      return { ok: true, needsConfirmation: !data.session };
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
