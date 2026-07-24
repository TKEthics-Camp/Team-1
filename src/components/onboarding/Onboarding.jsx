import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useAuth } from "../../store/AuthContext";
import { supabase } from "../../lib/supabase";
import { PALETTE, DEFAULT_THEME } from "../../lib/constants";
import { uid } from "../../lib/id";
import { askNotifications } from "../../lib/useReminderTimers";
import { isBlockedHobby } from "../../lib/hobbyFilter";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import WelcomeStep from "./WelcomeStep";
import GenderStep from "./GenderStep";
import AccountTypeStep from "./AccountTypeStep";
import ClassCodeStep from "./ClassCodeStep";
import NameStep from "./NameStep";
import InterestsStep from "./InterestsStep";
import ScheduleStep from "./ScheduleStep";
import ThemeStep from "./ThemeStep";

// Schools/groups get one extra question up front — a class code — instead
// of going straight to "what do you love doing". Everyone still ends up at
// the same interests/schedule/theme steps; only this one step differs.
function stepsFor(accountType) {
  const base = ["welcome", "gender", "account"];
  if (accountType === "org") base.push("classcode");
  return base.concat(["name", "interests", "schedule", "theme"]);
}

// Gender only ever picks a starting hair style for the avatar — everything
// else (skin, hair colour, outfit) stays the shared default and is free to
// change later from Me → avatar. "unspecified" keeps that same default.
function avatarForGender(gender) {
  if (gender === "boy") return { hair: "short" };
  if (gender === "girl") return { hair: "long" };
  return {};
}

export default function Onboarding() {
  const { t, lang } = useI18n();
  const { saveProfile, addInterest } = useStore();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState(null);
  const [accountType, setAccountType] = useState(null);
  const [classCode, setClassCode] = useState("");
  const [name, setName] = useState("");
  const [drafts, setDrafts] = useState([]);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [hobbyBlocked, setHobbyBlocked] = useState(false);
  const [nameError, setNameError] = useState(null);
  const [finishing, setFinishing] = useState(false);
  const steps = stepsFor(accountType);

  function addDraft(raw) {
    const nm = (raw || "").trim();
    if (!nm) return true;
    if (isBlockedHobby(nm)) { setHobbyBlocked(true); return false; }
    setHobbyBlocked(false);
    setDrafts((d) => [...d, { id: uid(), name: nm, color: PALETTE[d.length % PALETTE.length], time: "16:00", friends: [] }]);
    return true;
  }
  function removeDraft(i) {
    setDrafts((d) => d.filter((_, idx) => idx !== i));
  }
  function updateDraft(i, patch) {
    setDrafts((d) => d.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  async function finish() {
    if (finishing) return;
    const trimmedName = name.trim();

    // The `users` row already exists (created by the on_auth_user_created
    // trigger the moment this account signed up) — this just fills in the
    // display name and account type collected during onboarding. Checked
    // *before* anything local commits: a taken username needs to send them
    // back to fix the name, not finish onboarding with a name that never
    // actually saved server-side (see users_display_name_unique_idx).
    if (user) {
      setFinishing(true);
      const { error } = await supabase
        .from("users")
        .update({ display_name: trimmedName, account_type: accountType || "individual" })
        .eq("id", user.id);
      setFinishing(false);
      if (error) {
        console.error("Failed to sync profile:", error);
        setNameError(error.code === "23505" ? "usernameTaken" : "usernameError");
        setStep(steps.indexOf("name"));
        return;
      }
    }

    saveProfile({
      key: "profile", name: trimmedName, lang, color: PALETTE[0], theme,
      accountType: accountType || "individual",
      classCode: accountType === "org" ? classCode.trim().toUpperCase() : null,
      coins: 0, ownedDecorations: [], equippedDecoration: null, createdAt: Date.now(),
      avatar: avatarForGender(gender),
    });
    drafts.forEach((d) => {
      addInterest({
        id: d.id, name: d.name, color: d.color, why: "", time: d.time, days: d.days || [], friends: d.friends,
        createdAt: Date.now(), updatedAt: Date.now(),
      });
    });
    askNotifications();
  }

  return (
    <>
      <TopBar>
        <h1>{t("appName")}</h1>
        <LangToggle />
      </TopBar>
      <div className="view">
        <div className="onb">
          {steps[step] === "welcome" && <WelcomeStep onBegin={() => setStep(step + 1)} />}
          {steps[step] === "gender" && (
            <GenderStep value={gender} setGender={setGender} onNext={() => setStep(step + 1)} />
          )}
          {steps[step] === "account" && (
            <AccountTypeStep value={accountType} setType={setAccountType} onNext={() => setStep(step + 1)} />
          )}
          {steps[step] === "classcode" && (
            <ClassCodeStep code={classCode} setCode={setClassCode} onNext={() => setStep(step + 1)} />
          )}
          {steps[step] === "name" && (
            <NameStep
              name={name}
              setName={setName}
              onNext={() => setStep(step + 1)}
              error={nameError}
              clearError={() => setNameError(null)}
            />
          )}
          {steps[step] === "interests" && (
            <InterestsStep
              drafts={drafts}
              addDraft={addDraft}
              removeDraft={removeDraft}
              blocked={hobbyBlocked}
              onNext={() => setStep(step + 1)}
            />
          )}
          {steps[step] === "schedule" && (
            <ScheduleStep drafts={drafts} updateDraft={updateDraft} onEnter={() => setStep(step + 1)} />
          )}
          {steps[step] === "theme" && <ThemeStep value={theme} setTheme={setTheme} onEnter={finish} />}
        </div>
      </div>
    </>
  );
}
