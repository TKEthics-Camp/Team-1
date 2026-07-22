import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { STUDENTS, PALETTE } from "../../lib/constants";
import { shade } from "../../lib/color";
import { studentShared } from "../../lib/community";
import Avatar from "./Avatar";

// The interconnected web: you at the centre, classmates orbiting, a dotted
// line to anyone you share a hobby with. Tapping a node opens their sheet.
export default function SchoolTab() {
  const { t, lang } = useI18n();
  const { profile, interests } = useStore();
  const { openSheet } = useUI();

  const cx = 50, cy = 50, R = 37;
  const placed = STUDENTS.map((st, i) => {
    const ang = (i / STUDENTS.length) * Math.PI * 2 - Math.PI / 2;
    return { st, x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang), shared: studentShared(st, interests) };
  });

  return (
    <>
      <div className="safe-note">
        <span aria-hidden="true">🏫</span>
        <span>{t("schoolNote")}</span>
      </div>
      <div className="row">
        <div className="grow">
          <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 15 }}>{t("schoolName")}</div>
          <div className="sub">{STUDENTS.length + 1 + " " + t("classmates")}</div>
        </div>
      </div>

      <div className="web">
        <svg className="web-lines" viewBox="0 0 100 100">
          {placed.map(({ st, x, y, shared }) =>
            shared.length ? (
              <line key={st.name[0]} x1={cx} y1={cy} x2={x} y2={y} className="web-link" />
            ) : null
          )}
        </svg>

        {placed.map(({ st, x, y, shared }) => (
          <button
            key={st.name[0]}
            className={"web-node" + (shared.length ? " linked" : "")}
            aria-label={st.name[lang === "en" ? 0 : 1]}
            style={{ left: `${x}%`, top: `${y}%` }}
            onClick={() => openSheet("student", { student: st })}
          >
            <Avatar student={st} size={44} />
          </button>
        ))}

        <div className="web-node me" style={{ left: `${cx}%`, top: `${cy}%` }}>
          <div
            className="avatar"
            style={{
              width: 52, height: 52, fontSize: 22,
              background: `radial-gradient(circle at 34% 30%, ${shade(PALETTE[0], 40)}, ${shade(PALETTE[0], -45)})`,
            }}
          >
            {(profile.name || "Y").slice(0, 1).toUpperCase()}
          </div>
        </div>
      </div>
    </>
  );
}
