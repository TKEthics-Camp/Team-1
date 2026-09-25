// The guardian's link, read straight off the URL.
//
// It has to work with no session, no profile and no router: a parent
// following a text message is none of those things. App resolves it before
// the auth gate, so this is a plain string function over window.location
// rather than a route.
//
// Shape: <origin><base>consent/<token>. The token is 64 hex characters;
// anything else is treated as not-a-consent-link and falls through to the
// normal app, because a malformed token should look like a wrong address
// rather than a broken consent page.
export function guardianTokenFromPath(pathname, base = "/") {
  const withoutBase = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\//, "");
  const match = withoutBase.match(/^consent\/([0-9a-f]{64})\/?$/i);
  return match ? match[1].toLowerCase() : null;
}

export function guardianTokenFromLocation() {
  if (typeof window === "undefined") return null;
  return guardianTokenFromPath(window.location.pathname, import.meta.env.BASE_URL || "/");
}

// The policy pages, reachable with no session for the same reason the
// consent link is: a guardian reading what they are being asked to agree to
// does not have an account.
export function policyFromPath(pathname, base = "/") {
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\//, "");
  const match = rest.match(/^(privacy|terms)\/?$/i);
  return match ? match[1].toLowerCase() : null;
}

export function policyFromLocation() {
  if (typeof window === "undefined") return null;
  return policyFromPath(window.location.pathname, import.meta.env.BASE_URL || "/");
}
