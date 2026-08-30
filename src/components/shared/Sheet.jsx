// `className` lets a sheet opt into a different treatment — the add/edit tree
// sheet passes "tree-sheet" for the Figma's flat white card. Omitting it keeps
// the themed shelf every other sheet uses.
export default function Sheet({ onClose, children, className = "" }) {
  return (
    <div className="sheet-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={"sheet " + className}>{children}</div>
    </div>
  );
}
