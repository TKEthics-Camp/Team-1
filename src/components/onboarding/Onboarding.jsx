import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useAuth } from "../../store/AuthContext";
import { supabase } from "../../lib/supabase";
import { PALETTE, DEFAULT_THEME, CLASS_CODES } from "../../lib/constants";
import { uid } from "../../lib/id";
import { askNotifications } from "../../lib/useReminderTimers";
import { isBlockedHobby } from "../../lib/hobbyFilter";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import GenderStep from "./GenderStep";
import InterestsStep from "./InterestsStep";
import ScheduleStep from "./ScheduleStep";
import ThemeStep from "./ThemeStep";

// Account type and username/password are collected earlier now, in
// SignUpFlow, before this component ever mounts — this only finishes
// setting up the profile. A school/group account skips straight to theme:
// no hobby picking (interests/schedule) and no gender/avatar-hairstyle
// question, since neither applies to the adult running the dashboard.
// Their class code is minted automatically at finish() rather than typed
// in; students join *that* code later from Me → Join a class.
function stepsFor(accountType) {
  if (accountType === "org") return ["theme"];
  return ["gender", "interests", "schedule", "theme"];
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
  const accountType = (user && user.accountType) || "individual";
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [hobbyBlocked, setHobbyBlocked] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const steps = stepsFor(accountType);

  function addDraft(raw) {
    const nm = (raw || "").trim();
    if (!nm) return true;
    if (isBlockedHobby(nm)) { setHobbyBlocked(true); return false; }
    setHobbyBlocked(false);
    setDrafts((d) => [...d, { id: uid(), name: nm, color: PALETTE[d.length % PALETTE.length], time: "16:00" }]);
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
    const trimmedName = (user && user.username) || "";

    // The `users` row already exists (created by the on_auth_user_created
    // trigger the moment this account signed up) — this just fills in the
    // display name and account type collected during sign up. Username
    // uniqueness is already checked at sign-up time (SignUpFlow), not
    // here — there's no "name" step left in this flow to send someone
    // back to on a conflict. Debug and local-only accounts (Plan A — no
    // backend yet) have no real row to update; skip straight to the local
    // save.
    if (user && !user.isDebug && !user.isLocal) {
      setFinishing(true);
      const { error } = await supabase
        .from("users")
        .update({ display_name: trimmedName, account_type: accountType })
        .eq("id", user.id);
      setFinishing(false);
      if (error) {
        console.error("Failed to sync profile:", error);
        return;
      }
    }

    saveProfile({
      key: "profile", name: trimmedName, lang, color: PALETTE[0], theme,
      accountType,
      classCode: accountType === "org" ? CLASS_CODES[0] : null,
      coins: 0, ownedDecorations: [], equippedDecoration: null, createdAt: Date.now(),
      avatar: avatarForGender(gender),
      userId: user ? user.id : null,
    });
    drafts.forEach((d) => {
      addInterest({
        id: d.id, name: d.name, color: d.color, why: "", time: d.time, days: d.days || [],
        createdAt: Date.now(), updatedAt: Date.now(),
      });
    });
    askNotifications();
  }

  return (
    <>
      <TopBar>
        {step > 0 && (
          <button className="icon" aria-label={t("back")} onClick={() => setStep(step - 1)}>←</button>
        )}
        <h1>{t("appName")}</h1>
        <LangToggle />
      </TopBar>
      <div className="view">
        <div className="onb">
          {steps[step] === "gender" && (
            <GenderStep value={gender} setGender={setGender} onNext={() => setStep(step + 1)} />
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
