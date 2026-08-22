import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useAuth } from "../../store/AuthContext";
import { PALETTE, DEFAULT_THEME, CLASS_CODES } from "../../lib/constants";
import { uid } from "../../lib/id";
import { askNotifications } from "../../lib/useReminderTimers";
import { isBlockedHobby } from "../../lib/hobbyFilter";
import LangToggle from "../shared/LangToggle";
import WelcomeStep from "./WelcomeStep";
import IntroStep from "./IntroStep";
import GenderStep from "./GenderStep";
import InterestsStep from "./InterestsStep";
import ConfirmHobbiesStep from "./ConfirmHobbiesStep";
import ScheduleStep from "./ScheduleStep";
import LookStep from "./LookStep";

// Account type and username are settled before this ever mounts — see
// AuthFlow, which collects them at signup along with the one real branch
// point (an educator gives a real email, an individual never does).
// Onboarding just reads `user.user_metadata` for both. A school/group
// account is the educator running a class, not a student joining one — so
// it skips the hobby steps (interests/confirm/schedule) and the gender/
// avatar-hairstyle question, since neither applies to the adult running the
// dashboard. Their class code is minted automatically at finish() rather
// than typed in; students join *that* code later from Me → Join a class.
function stepsFor(accountType) {
  const base = ["welcome", "intro"];
  if (accountType === "org") return base.concat(["look"]);
  return base.concat(["gender", "interests", "confirm", "schedule", "look"]);
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
  const meta = (user && user.user_metadata) || {};
  const accountType = meta.accountType || "individual";
  const name = meta.username || "";
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [hobbyBlocked, setHobbyBlocked] = useState(false);
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
  // Tapping a row on the hobby list is add-or-remove, keyed by name.
  function toggleDraft(nm) {
    const at = drafts.findIndex((d) => d.name === nm);
    if (at >= 0) removeDraft(at); else addDraft(nm);
  }

  function finish() {
    saveProfile({
      key: "profile", name, lang, color: PALETTE[0], theme,
      accountType,
      classCode: accountType === "org" ? CLASS_CODES[0] : null,
      coins: 0, ownedDecorations: [], equippedDecoration: null, createdAt: Date.now(),
      avatar: avatarForGender(gender),
      userId: user ? user.id : null,
    });
    drafts.forEach((d) => {
      addInterest({
        id: d.id, name: d.name, color: d.color, why: "", time: d.time, days: d.days || [], friends: d.friends,
        createdAt: Date.now(), updatedAt: Date.now(),
      });
    });
    askNotifications();
  }

  const current = steps[step];

  return (
    <div className="view sf-view">
      <div className="sf">
        <div className="sf-bar">
          {step > 0 && (
            <button className="sf-back" aria-label={t("back")} onClick={() => setStep(step - 1)}>‹</button>
          )}
          <div className="sf-grow" />
          <LangToggle />
        </div>

        {current === "welcome" && <WelcomeStep onBegin={() => setStep(step + 1)} />}
        {current === "intro" && <IntroStep onNext={() => setStep(step + 1)} />}
        {current === "gender" && (
          <GenderStep value={gender} setGender={setGender} onNext={() => setStep(step + 1)} />
        )}
        {current === "interests" && (
          <InterestsStep
            drafts={drafts}
            toggleDraft={toggleDraft}
            addDraft={addDraft}
            blocked={hobbyBlocked}
            onNext={() => setStep(step + 1)}
          />
        )}
        {current === "confirm" && (
          <ConfirmHobbiesStep
            drafts={drafts}
            updateDraft={updateDraft}
            removeDraft={removeDraft}
            addDraft={addDraft}
            blocked={hobbyBlocked}
            onNext={() => setStep(step + 1)}
          />
        )}
        {current === "schedule" && (
          <ScheduleStep drafts={drafts} updateDraft={updateDraft} onEnter={() => setStep(step + 1)} />
        )}
        {current === "look" && <LookStep value={theme} setTheme={setTheme} onEnter={finish} />}
      </div>
    </div>
  );
}
