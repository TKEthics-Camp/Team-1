export default function ProgressBar({ step, total }) {
  const pct = Math.round(((step + 1) / total) * 100);
  return (
    <div className="progressbar">
      <div className="fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
