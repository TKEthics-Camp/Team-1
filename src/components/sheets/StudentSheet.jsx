import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { PALETTE } from "../../lib/constants";
import { fmtHours } from "../../lib/derived";
import { haveHobby, ideaColor } from "../../lib/explore";
import { studentShared } from "../../lib/community";
import Sheet from "../shared/Sheet";
import Tree from "../shared/Tree";
import Avatar from "../explore/Avatar";

// Tap a classmate: their (fake) orbs and what you share. No message button —
// the constitution's hard line is that no outside person can reach the kid.
export default function StudentSheet({ student }) {
  const { t, lang } = useI18n();
  const { interests } = useStore();
  const { closeSheet, openSheet } = useUI();
  if (!student) return null;

  const shared = studentShared(student, interests);
  const sharedNames = shared.map((o) => o[lang === "en" ? 0 : 1]).join(lang === "en" ? ", " : "、");

  return (
    <Sheet onClose={closeSheet}>
      <div className="row" style={{ gap: 12 }}>
        <Avatar student={student} size={46} />
        <div className="grow">
          <h2>{student.name[lang === "en" ? 0 : 1]}</h2>
          <div className="sub">{t("schoolName")}</div>
        </div>
      </div>

      <div className="safe-note" style={{ background: "var(--sel)" }}>
        <span aria-hidden="true">{shared.length ? "✨" : "🌱"}</span>
        <span>{shared.length ? t("sharesWith") + " " + sharedNames : t("sharesNone")}</span>
      </div>

      <div className="label">{t("theirOrbs")}</div>
      <div className="ideas">
        {student.orbs.map((o) => {
          const isShared = shared.indexOf(o) !== -1;
          const name = o[lang === "en" ? 0 : 1];
          return (
            <div className="idea" key={o[0]}>
              <div style={{ flex: "none" }}>
                <Tree interest={{ color: PALETTE[student.color], name }} size={46} stage={3} health="healthy" />
              </div>
              <div className="grow">
                <div className="idea-nm">{name}</div>
                <div className="idea-cat">{fmtHours(o[3]) + (isShared ? "  ·  ✨" : "")}</div>
              </div>
              {!haveHobby(interests, o) && (
                <button
                  className="idea-add"
                  onClick={() => openSheet("orb", { preset: { name: o[0], nameZh: o[1], color: PALETTE[ideaColor(o[0])] } })}
                >
                  {t("startThis")}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button className="btn2" onClick={closeSheet}>{t("close")}</button>
    </Sheet>
  );
}
