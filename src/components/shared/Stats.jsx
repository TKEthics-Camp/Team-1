export default function Stats({ items }) {
  return (
    <div className="stats">
      {items.map((it, i) => (
        <div key={i} className={it.flame ? "stat flame" : "stat"}>
          <span className="n">{it.n}</span>
          <span className="k">{it.k}</span>
        </div>
      ))}
    </div>
  );
}
