// Stands in for store/AuthContext in the design preview only.
const user = { id: "preview-user", email: "lin@users.forestapp.invalid" };
export function AuthProvider({ children }) { return children; }
export function useAuth() {
  return new Proxy(
    { session: { user }, user, loading: false, authError: null },
    { get: (o, k) => (k in o ? o[k] : async () => ({ ok: true })) },
  );
}
