import Mascot from "./Mascot";

// Sprig shows up wherever there's nothing to look at yet — an empty grove,
// an empty album, an empty journal — so the "nothing here" moment still
// feels like part of the app instead of a blank hole.
export default function EmptyState({ text }) {
  return (
    <div className="empty">
      <Mascot size={56} className="empty-mascot" />
      <div>{text}</div>
    </div>
  );
}
