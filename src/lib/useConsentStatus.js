import { useEffect, useState } from "react";
import { myConsentStatus } from "./remote";

// Consent state, fetched once per signed-in account rather than once per
// screen. Several screens need it to decide what to show, and each of them
// asking the server separately would be a round trip per tab switch for an
// answer that cannot change while the app is open.
//
// This only decides what is *drawn*. Nothing here is a security boundary:
// every surface it hides is independently closed in RLS (20260918000000),
// so a client that ignored this would still see nothing.
let cachedFor = null;
let cached = null;
let inFlight = null;

export function forgetConsentStatus() {
  cachedFor = null;
  cached = null;
  inFlight = null;
}

export function useConsentStatus(userId) {
  const [status, setStatus] = useState(cachedFor === userId ? cached : null);

  useEffect(() => {
    if (!userId) { setStatus(null); return; }
    if (cachedFor === userId && cached) { setStatus(cached); return; }

    let cancelled = false;
    if (cachedFor !== userId) {
      cachedFor = userId;
      inFlight = null;
    }
    if (!inFlight) inFlight = myConsentStatus();
    inFlight.then((value) => {
      cached = value;
      if (!cancelled) setStatus(value);
    });
    return () => { cancelled = true; };
  }, [userId]);

  return status;
}
