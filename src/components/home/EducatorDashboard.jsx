import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { STUDENTS } from "../../lib/constants";
import { fmtHours } from "../../lib/derived";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import Stats from "../shared/Stats";
import Avatar from "../explore/Avatar";

// What an org account lands on instead of the personal tree garden: their
// class code to hand out, and a roster of the (demo) students who'd join
// with it. Educators don't log hobbies themselves, so there's no OrbWall
// here — this *is* their Home.
export default function EducatorDashboard() {
  const { t, lang } = useI18n();
  const { profile } = useStore();
  const { openSheet } = useUI();
  const [copied, setCopied] = useState(false);

  const hobbyCount = STUDENTS.reduce((n, st) => n + st.orbs.length, 0);

  function copyCode() {
    if (navigator.clipboard) navigator.clipboard.writeText(profile.classCode || "").catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <TopBar>
        <h1>{t("dashboardGreeting")}</h1>
        <LangToggle />
      </TopBar>
      <div className="view">
        <div className="label">{t("yourClassCode")}</div>
        <div className="code-card" data-tour="streak">
          <span className="code-value">{profile.classCode}</span>
          <button type="button" className="chip" onClick={copyCode}>
            {copied ? t("codeCopied") : t("copyCode")}
          </button>
        </div>
        <div className="sub">{t("classCodeShareNote")}</div>

        <Stats items={[
          { n: STUDENTS.length, k: t("studentsCount") },
          { n: hobbyCount, k: t("hobbiesLogged") },
        ]} />

        <div className="label" data-tour="trees">{t("yourStudents")}</div>
        <div className="sub">{t("dashboardRosterNote")}</div>
        <div className="ideas">
          {STUDENTS.map((st) => {
            const top = st.orbs[0];
            return (
              <button
                key={st.name[0]}
                type="button"
                className="idea"
                onClick={() => openSheet("student", { student: st })}
              >
                <Avatar student={st} size={44} />
                <div className="grow">
                  <div className="idea-nm">{st.name[lang === "en" ? 0 : 1]}</div>
                  <div className="idea-cat">{top[lang === "en" ? 0 : 1] + "  ·  " + fmtHours(top[3])}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
