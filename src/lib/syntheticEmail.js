// Individuals sign up with just a username + password — no email required,
// since some students don't have one. Supabase Auth's API still requires
// *an* email though, so this derives one deterministically from the
// username, never meant to be a real, reachable inbox. Login re-derives the
// same address from the same username rather than looking anything up, so
// this only ever needs to be consistent with itself, not deliverable.
// Org/educator accounts give a real email instead (see AuthFlow), since
// only they need one.
//
// Two usernames that differ only in ASCII punctuation or spacing would
// collide on the derived address — display_name's own unique index (see
// supabase/migrations) is still the real uniqueness gate; a collision here
// just surfaces as Supabase's own "already registered" error, which AuthFlow
// reports as a taken username.
const DOMAIN = "@users.forestapp.invalid";

function slugOf(username) {
  return (username || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[.\-_]+|[.\-_]+$/g, "");
}

// A short fingerprint of a name (53 bits, cyrb53). Synchronous because login
// needs it, and short because an address's local part stops at 64 characters
// and twenty Chinese characters would pass that if they were spelled out.
// Changing this would lock out everyone whose address came from it.
function fingerprint(name) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < name.length; i++) {
    const c = name.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// Anything outside ASCII used to be dropped from the address altogether, so
// every all-Chinese username came out as the same user@ address: the first
// student to pick one got it, and every one after them was told the account
// already existed. Those names now carry a fingerprint of what was dropped.
// Plain ASCII names keep the address they always had.
export function usernameToEmail(username) {
  const name = (username || "").trim().toLowerCase().normalize("NFC");
  const slug = slugOf(name);
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7f]/.test(name)) return (slug || "user") + DOMAIN;
  return (slug || "u") + "-" + fingerprint(name) + DOMAIN;
}

// The address this username would have been given before the fingerprint.
// Accounts already created under it keep working: login falls back to it.
export function legacyUsernameToEmail(username) {
  return (slugOf(username) || "user") + DOMAIN;
}

// True for an address this file made, which is how a rename tells a student's
// login (it follows the username) from an educator's real email (it doesn't).
export function isDerivedEmail(email) {
  return !!email && email.endsWith(DOMAIN);
}
