import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useAuth } from "../../store/AuthContext";
import { createClass } from "../../lib/remote";

// No 0/O or 1/I — a code an educator reads out loud to a classroom
// shouldn't have characters that sound or look identical.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(len = 6) {
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

// The org-account counterpart to ClassCodeStep: an educator doesn't join a
// class here, they create one, and this generates + reserves the code they
// hand out. The tiny collision odds (6 chars from a 33-char alphabet) are
// handled by just retrying with a fresh code — `classes.id` is the primary
// key, so a collision fails the insert cleanly rather than silently
// clobbering someone else's class.
export default function CreateClassStep({ code, setCode, onNext }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [status, setStatus] = useState(code ? "ready" : "creating");

  useEffect(() => {
    if (!code) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    if (!user) { setStatus("error"); return; }
    setStatus("creating");
    for (let tries = 0; tries < 5; tries++) {
      const candidate = randomCode();
      const ok = await createClass(candidate, user.id);
      if (ok) { setCode(candidate); setStatus("ready"); return; }
    }
    setStatus("error");
  }

  return (
    <>
      <h2>{t("createClassTitle")}</h2>
      <p>{t("createClassSub")}</p>

      <div className="center" style={{ padding: "28px 0" }}>
        {status === "creating" && <p className="sub">{t("createClassWorking")}</p>}
        {status === "error" && <p className="field-error">{t("createClassError")}</p>}
        {status === "ready" && <div className="class-code-display">{code}</div>}
      </div>

      {status === "ready" && <p className="sub" style={{ textAlign: "center" }}>{t("createClassNote")}</p>}
      {status === "error" && <button className="btn2" onClick={generate}>{t("tryAgain")}</button>}

      <div className="grow" />
      <button className="btn" disabled={status !== "ready"} onClick={onNext}>{t("next")}</button>
    </>
  );
}
