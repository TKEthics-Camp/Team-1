// What a recovery code *is*, separate from how it gets stored.
//
// A student has no email, so a code written down on paper is the only way
// back into a forgotten account (PRD §14.3). That piece of paper is the
// whole design constraint: the code is produced by the app, copied out by
// hand by a child, kept in a pencil case for weeks, and typed back in by
// the same child on a bad day.
//
// The alphabet omits 0/O/1/I/L/5/S — those are the pairs that get misread
// in handwriting. 12 characters from 25 symbols is about 56 bits, far past
// guessable, and still only three short groups to write down.
const RECOVERY_ALPHABET = "ABCDEFGHJKMNPQRTUVWXYZ2346789";

// The displayed form, grouped with dashes so it can be transcribed without
// losing your place. The dashes are punctuation for the reader; they are
// not part of the code, which is what canonicalRecoveryCode exists to say.
export function generateRecoveryCode() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length]);
  return chars.slice(0, 4).join("") + "-" + chars.slice(4, 8).join("") + "-" + chars.slice(8, 12).join("");
}

// The form that gets hashed and compared: letters and digits only, upper
// case. Everything about how the code was written down or typed back —
// spacing, dash grouping, capitalisation — is stripped here, before it can
// reach the hash.
//
// This is the one place that decides what a code is, and both halves of the
// feature go through it. They used to disagree: issuing hashed the string
// with its dashes in, while redeeming stripped only whitespace. A child who
// wrote the code down in one grouping and typed it back in another was told
// their code was wrong, with no way to find out otherwise.
export function canonicalRecoveryCode(raw) {
  return String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}
