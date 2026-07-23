export default function Sheet({ onClose, children }) {
  return (
    <div className="sheet-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet">
        <div className="handle" />
        {children}
      </div>
    </div>
  );
}
