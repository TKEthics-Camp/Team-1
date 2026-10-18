import Icon from "./Icon";

// icon and tone are optional: a small tinted badge above the label, the
// same soft colours as the tags (see Icon.jsx).
export default function Stats({ items }) {
  return (
    <div className="stats">
      {items.map((it, i) => (
        <div key={i} className={it.flame ? "stat flame" : "stat"}>
          <span className="n">{it.n}</span>
          <span className="k">{it.k}</span>
          {it.icon && (
            <span className={`stat-ico tag-${it.tone || "grey"}`}><Icon name={it.icon} size={15} /></span>
          )}
        </div>
      ))}
    </div>
  );
}
