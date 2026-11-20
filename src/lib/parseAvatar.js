// users.avatar is '' until the first sync, and JSON.parse('') throws —
// null here means "nothing remote yet" (render the default look), not
// "reset to defaults" as a stored value.
export function parseAvatar(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
