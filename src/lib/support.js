// The one address people use to reach whoever runs Forest.
//
// Apple 1.2 requires published contact information for any app with
// user-generated content, and 1.5 singles out classroom apps. A parent with a
// question about their child's photographs, a teacher with a broken class
// code, and a student who is being bullied all need somewhere to write.
//
// DELIBERATELY EMPTY UNTIL A REAL ADDRESS EXISTS. It should be an address
// the project owns — support@ on its own domain — and read by the person
// responsible for the app, not a personal inbox. Until it is set, the
// support page falls back to "ask the adult who gave you Forest", because
// shipping a placeholder address is worse than shipping none: Apple rejects
// placeholder text (2.1), and a parent who writes to a dead address has been
// told something false.
export const SUPPORT_EMAIL = "";

// How quickly someone should expect a reply. Stated on the support page
// because "timely responses" (Apple 1.2) is only a promise if it is written
// down. Change it to whatever the person answering can actually keep.
export const SUPPORT_REPLY_DAYS = 3;
