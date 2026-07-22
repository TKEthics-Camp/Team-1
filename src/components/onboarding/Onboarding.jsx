import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { PALETTE } from "../../lib/constants";
import { uid } from "../../lib/id";
import { askNotifications } from "../../lib/useReminderTimers";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import WelcomeStep from "./WelcomeStep";
import NameStep from "./NameStep";
import InterestsStep from "./InterestsStep";
import ScheduleStep from "./ScheduleStep";

export default function Onboarding() {
  const { t, lang } = useI18n();
  const { saveProfile, addInterest } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [drafts, setDrafts] = useState([]);

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
    saveProfile({ key: "profile", name: name.trim(), lang, color: PALETTE[0], createdAt: Date.now() });
    drafts.forEach((d) => {
      addInterest({
        id: d.id, name: d.name, color: d.color, why: "", time: d.time, friends: d.friends,
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
          {step === 0 && <WelcomeStep onBegin={() => setStep(1)} />}
          {step === 1 && <NameStep name={name} setName={setName} onNext={() => setStep(2)} />}
          {step === 2 && (
            <InterestsStep drafts={drafts} addDraft={addDraft} removeDraft={removeDraft} onNext={() => setStep(3)} />
          )}
          {step === 3 && <ScheduleStep drafts={drafts} updateDraft={updateDraft} onEnter={finish} />}
        </div>
      </div>
    </>
  );
}
