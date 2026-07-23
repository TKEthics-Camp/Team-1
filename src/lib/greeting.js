export function getGreeting(date) {
  var h = (date || new Date()).getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}
