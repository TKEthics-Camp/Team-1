export default function Fab({ icon, onClick, "aria-label": ariaLabel }) {
  return (
    <button className="fab" onClick={onClick} aria-label={ariaLabel}>
      {icon}
    </button>
  );
}
