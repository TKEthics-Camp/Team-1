// Ring-bordered circle with a flat color fill and an initial letter — used
// for the profile avatar and the small header avatar on the Interest screen.
// No photo upload in this pass, so this is always the initial-fill variant.
export default function Avatar({ color, initial, size = 40, onClick }) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag className="avatar" style={{ "--c": color, width: size, height: size }} onClick={onClick} type={onClick ? "button" : undefined}>
      <span className="avatar-fill" style={{ fontSize: Math.round(size * 0.4) }}>
        {(initial || "").slice(0, 1).toUpperCase()}
      </span>
    </Tag>
  );
}
