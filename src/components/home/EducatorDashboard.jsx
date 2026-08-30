import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { fetchClassmates, mintOrFetchClassCode } from "../../lib/remote";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import Stats from "../shared/Stats";
import PersonAvatar from "../shared/PersonAvatar";

// What an org account lands on instead of the personal tree garden: their
// class code to hand out, and a roster of the real students who've joined
// with it. Educators don't log hobbies themselves, so there's no OrbWall
// here — this *is* their Home.
export default function EducatorDashboard() {
  const { t } = useI18n();
  const { profile, updateProfile } = useStore();
  const { openSheet } = useUI();
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState({ loading: true, students: [] });

  // Self-heal for an account whose class code never landed — the mint
  // attempt at the end of onboarding is fire-and-forget, so a network
  // hiccup or an interrupted signup can leave an org account with no
  // code and no error the user ever saw. Landing here is the one place
  // that's guaranteed to happen next, so it's also the retry point.
  useEffect(() => {
    if (profile.classCode || !profile.userId) return;
    mintOrFetchClassCode(profile.userId).then((code) => {
      if (code) updateProfile({ classCode: code });
    });
  }, [profile.classCode, profile.userId, updateProfile]);

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, students: [] });
    fetchClassmates(profile.userId, profile.classCode).then((students) => {
      if (!cancelled) setState({ loading: false, students });
    });
    return () => { cancelled = true; };
  }, [profile.userId, profile.classCode]);

  const { loading, students } = state;

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
        <div className="code-card">
          <span className="code-value">{profile.classCode}</span>
          <button type="button" className="chip" onClick={copyCode}>
            {copied ? t("codeCopied") : t("copyCode")}
          </button>
        </div>
        <div className="sub">{t("classCodeShareNote")}</div>

        <Stats items={[{ n: students.length, k: t("studentsCount") }]} />

        <div className="label">{t("yourStudents")}</div>
        <div className="sub">{loading ? t("profileLoading") : students.length === 0 ? t("dashboardRosterEmpty") : t("dashboardRosterNote")}</div>
        <div className="ideas">
          {students.map((u) => (
            <button
              key={u.id}
              type="button"
              className="idea"
              onClick={() => openSheet("userProfile", { userId: u.id, displayName: u.display_name, accountType: u.account_type, avatar: u.avatar })}
            >
              <PersonAvatar avatar={u.avatar} size={44} />
              <div className="grow">
                <div className="idea-nm">{u.display_name}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
