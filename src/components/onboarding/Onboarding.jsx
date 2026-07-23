import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { PALETTE, DEFAULT_THEME } from "../../lib/constants";
import { uid } from "../../lib/id";
import { askNotifications } from "../../lib/useReminderTimers";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import WelcomeStep from "./WelcomeStep";
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
  const base = ["welcome", "account"];
  if (accountType === "org") base.push("classcode");
  return base.concat(["name", "interests", "schedule", "theme"]);
}

export default function Onboarding() {
  const { t, lang } = useI18n();
  const { saveProfile, addInterest } = useStore();
  const [step, setStep] = useState(0);
  const [accountType, setAccountType] = useState(null);
  const [classCode, setClassCode] = useState("");
  const [name, setName] = useState("");
  const [drafts, setDrafts] = useState([]);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const steps = stepsFor(accountType);

  function addDraft(raw) {
    const nm = (raw || "").trim();
    if (!nm) return;
    setDrafts((d) => [...d, { id: uid(), name: nm, color: PALETTE[d.length % PALETTE.length], time: "16:00", friends: [] }]);
  }
  function removeDraft(i) {
    setDrafts((d) => d.filter((_, idx) => idx !== i));
  }
  function updateDraft(i, patch) {
    setDrafts((d) => d.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  function finish() {
    saveProfile({
      key: "profile", name: name.trim(), lang, color: PALETTE[0], theme,
      accountType: accountType || "individual",
      classCode: accountType === "org" ? classCode.trim().toUpperCase() : null,
      coins: 0, ownedDecorations: [], equippedDecoration: null, createdAt: Date.now(),
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
          {steps[step] === "account" && (
            <AccountTypeStep value={accountType} setType={setAccountType} onNext={() => setStep(step + 1)} />
          )}
          {steps[step] === "classcode" && (
            <ClassCodeStep code={classCode} setCode={setClassCode} onNext={() => setStep(step + 1)} />
          )}
          {steps[step] === "name" && <NameStep name={name} setName={setName} onNext={() => setStep(step + 1)} />}
          {steps[step] === "interests" && (
            <InterestsStep drafts={drafts} addDraft={addDraft} removeDraft={removeDraft} onNext={() => setStep(step + 1)} />
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
