export default function Sheet({ onClose, children }) {
  return (
    <div className="sheet-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet">{children}</div>
    </div>
  );
}
