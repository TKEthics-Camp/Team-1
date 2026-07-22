export default function Field({ label, children }) {
  return (
    <div className="field">
      <span className="label">{label}</span>
      {children}
    </div>
  );
}
