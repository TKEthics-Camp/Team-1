// The versions of the Terms and Privacy Policy a guardian is shown when
// they agree. Stored on the consent record, because a record that cannot
// say which version was on screen is not evidence that anything was agreed
// to — it is just a timestamp.
//
// THESE POINT AT DOCUMENTS THAT DO NOT EXIST YET. PRD §14.2 has listed the
// policy text as a blocker since the first draft, and it has to come from a
// lawyer, not from this file. Bump the version string on any change to
// either document that alters what is collected, who can see it, or how
// long it is kept; existing consent records keep the version they were
// taken under, which is the point.
export const TERMS_VERSION = "2026-09-18.draft";
export const PRIVACY_VERSION = "2026-09-18.draft";

// What the guardian is told Forest collects, in the consent screen's own
// words. Kept here rather than inline so the SMS, the consent page and the
// policy document cannot drift apart silently.
export const COLLECTED = ["photos", "voiceNotes", "journalText"];
