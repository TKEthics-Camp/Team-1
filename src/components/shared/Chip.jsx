export default function Chip({ pressed = false, onClick, children, className = "" }) {
  return (
    <button
      type="button"
      className={className ? `chip ${className}` : "chip"}
      aria-pressed={pressed ? "true" : "false"}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
