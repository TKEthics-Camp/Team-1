export function uid() {
  return "o" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// No 0/O/1/I/L — a code only exists to be read off a screen and typed back
// in by someone else, so it should never be ambiguous out loud or on paper.
const CLASS_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function randomClassCode() {
  let s = "";
  for (let i = 0; i < 6; i++) s += CLASS_CODE_CHARS[Math.floor(Math.random() * CLASS_CODE_CHARS.length)];
  return s;
}
