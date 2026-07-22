import { useI18n } from "../../i18n/I18nContext";
import { PALETTE } from "../../lib/constants";
import { shade } from "../../lib/color";

// A student's face: a coloured sphere with their initial. Deliberately not a
// photo of a real child.
export default function Avatar({ student, size }) {
  const { lang } = useI18n();
  const c = PALETTE[student.color];
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.44),
        background: `radial-gradient(circle at 34% 30%, ${shade(c, 40)}, ${shade(c, -45)})`,
      }}
    >
      {student.name[lang === "en" ? 0 : 1].slice(0, 1)}
    </div>
  );
}
