import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { fmtElapsed } from "../../lib/sessionTimer";
import Icon, { hobbyLook } from "./Icon";

// The running session timer, floating just above the tab bar on every
// screen: which hobby, how long so far, and the one thing to do with it.
//
// It is deliberately small and says nothing else. The point of a session is
// that the student is somewhere else doing the thing — the phone only needs
// to still know when they get back.
export default function SessionPill() {
  const { t, nameOf } = useI18n();
  const { interests } = useStore();
  const { session, endSession, cancelSession, openSheet } = useUI();
  const [now, setNow] = useState(() => Date.now());
  // Discarding takes two taps: one stray touch shouldn't cost forty minutes.
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!session) return undefined;
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [session]);

  useEffect(() => {
    if (!armed) return undefined;
    const back = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(back);
  }, [armed]);

  const it = session ? interests.find((x) => x.id === session.interestId) : null;

  // The hobby being timed was deleted. Checked only once there is a garden
  // to check against, so a list that hasn't arrived yet can't end a session.
  useEffect(() => {
    if (session && !it && interests.length > 0) cancelSession();
  }, [session, it, interests.length, cancelSession]);

  if (!session || !it) return null;

  const look = hobbyLook(it.name);

  function stop() {
    const done = endSession();
    if (done) openSheet("entry", { id: done.interestId, minutes: done.minutes });
  }

  return (
    <div className="session-pill" role="status" aria-label={t("timerRunning").replace("{name}", nameOf(it))}>
      <span className="session-dot" aria-hidden="true" />
      <Icon name={look.icon} size={16} className="session-ico" />
      <span className="session-name">{nameOf(it)}</span>
      <span className="session-time">{fmtElapsed(now - session.startedAt)}</span>
      <button type="button" className="session-stop" onClick={stop}>{t("timerStop")}</button>
      <button
        type="button"
        className={"session-x" + (armed ? " armed" : "")}
        aria-label={t("timerCancel")}
        onClick={() => (armed ? cancelSession() : setArmed(true))}
      >
        {armed ? t("timerCancel") : <Icon name="x" size={15} />}
      </button>
    </div>
  );
}
