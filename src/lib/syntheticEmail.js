// Individuals sign up with just a username + password — no email required,
// since some students don't have one. Supabase Auth's API still requires
// *an* email though, so this derives one deterministically from the
// username, never meant to be a real, reachable inbox. Login re-derives the
// same address from the same username rather than looking anything up, so
// this only ever needs to be consistent with itself, not deliverable.
// Org/educator accounts give a real email instead (see AuthFlow), since
// only they need one.
//
// Two usernames that differ only in the characters stripped here (e.g.
// punctuation) would collide on the derived address — display_name's own
// unique index (see supabase/migrations) is still the real uniqueness
// gate; a collision here just surfaces as Supabase's own "already
// registered" error, handled as a generic retry in AuthFlow.
export function usernameToEmail(username) {
  const slug = (username || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[.\-_]+|[.\-_]+$/g, "");
  return (slug || "user") + "@users.forestapp.invalid";
}
