export default function Stats({ items, layout }) {
  return (
    <div className={layout === "grid" ? "stats grid" : "stats"}>
      {items.map((it, i) => (
        <div key={i} className={it.flame ? "stat flame" : "stat"}>
          <span className="n">{it.n}</span>
          <span className="k">{it.k}</span>
        </div>
      ))}
    </div>
  );
}
