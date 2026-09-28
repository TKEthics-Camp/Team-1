import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { moderationQueue, moderateHide, moderateResolve, ageGateBypassCount } from "../../lib/remote";
import { usePhotoURL, useAudioURL } from "../../lib/image";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import VoiceNote from "../shared/VoiceNote";

// Own components, same reason AlbumTab's PhotoThumb and JournalTab's
// EntryVoiceNote are: usePhotoURL/useAudioURL are hooks, so they can't run
// directly inside the list's own .map() callback. No local cache to write
// back to here (this is a one-off admin view, not a device that keeps
// anything), so no onDownloaded.
function ModPhoto({ storagePath }) {
  const url = usePhotoURL({ storagePath });
  if (!url) return null;
  return <img src={url} alt="" className="mod-photo" />;
}

function ModAudio({ audioPath, audioMs }) {
  const url = useAudioURL({ audioPath });
  return <VoiceNote url={url} ms={audioMs} />;
}

// The other end of the report button.
//
// Deliberately plain and deliberately fast: the whole reason reports went
// unread was that reading them was impossible, and the next worst thing is
// making it tedious. Every report arrives with the reported text — and now
// the reported photo or voice note itself — already attached, so a
// decision takes one look and one tap.
//
// English only, on purpose. This is a staff tool for whoever is named
// responsible for the app, not a screen any student will ever open — and
// pretending otherwise by translating it would suggest it is part of the
// product.
export default function ModerationScreen() {
  const { t } = useI18n();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [bypassCount, setBypassCount] = useState(0);

  async function load() {
    const result = await moderationQueue();
    if (!result.ok) { setError(result.message); setRows([]); return; }
    setError(null);
    setRows(result.rows);
  }

  useEffect(() => {
    load();
    ageGateBypassCount().then(setBypassCount);
  }, []);

  async function hide(row, hidden) {
    setBusy(row.id);
    const result = await moderateHide(row.target_type, row.target_id, hidden);
    setBusy(null);
    if (!result.ok) { setError(result.message); return; }
    load();
  }

  async function resolve(row, status) {
    setBusy(row.id);
    const result = await moderateResolve(row.id, status);
    setBusy(null);
    if (!result.ok) { setError(result.message); return; }
    load();
  }

  return (
    <>
      <TopBar>
        <h1>Reports</h1>
        <LangToggle />
      </TopBar>
      <div className="view">
        {error && <div className="field-error" style={{ overflowWrap: "anywhere" }}>{error}</div>}

        {/* The age gate degrades to "let signup through" when its migration
            isn't deployed (see applyAgeGate). That's the right call for one
            account, but silent forever is not — this is where it stops
            being silent. */}
        {bypassCount > 0 && (
          <div className="field-error" style={{ overflowWrap: "anywhere" }}>
            {bypassCount} account{bypassCount === 1 ? "" : "s"} signed up while the age gate was
            not deployed on this project — every signup went through ungated. Deploy
            20260918000000_age_gate_guardian_consent.sql to close this.
          </div>
        )}

        {rows === null ? (
          <div className="sub">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="sub">Nothing open. Every report has been dealt with.</div>
        ) : (
          <>
            <div className="sub">{rows.length} open</div>
            {rows.map((row) => (
              <div key={row.id} className="mod-row">
                <div className="mod-head">
                  <span className="mod-kind">{row.target_type}</span>
                  {row.is_hidden && <span className="mod-hidden">hidden</span>}
                  <span className="mod-when">{new Date(row.created_at).toLocaleString()}</span>
                </div>

                <div className="mod-reason">Reported as: {row.reason}</div>

                {/* The reported thing itself — text, photo, or voice note.
                    A moderator deciding without seeing or hearing it is
                    guessing. */}
                <div className="mod-content">
                  {row.content && <div>{row.content}</div>}
                  {row.storage_path && <ModPhoto storagePath={row.storage_path} />}
                  {row.audio_path && <ModAudio audioPath={row.audio_path} audioMs={row.audio_ms} />}
                  {!row.content && !row.storage_path && !row.audio_path && (
                    <em>(nothing left to show — it may have since been deleted)</em>
                  )}
                </div>

                <div className="mod-by">filed by {row.reporter_name || "unknown"}</div>

                <div className="mod-actions">
                  {row.target_type !== "user" && (
                    <button
                      className="btn2"
                      disabled={busy === row.id}
                      onClick={() => hide(row, !row.is_hidden)}
                    >
                      {row.is_hidden ? "Unhide" : "Hide it"}
                    </button>
                  )}
                  <button
                    className="btn2"
                    disabled={busy === row.id}
                    onClick={() => resolve(row, "actioned")}
                  >
                    Actioned
                  </button>
                  <button
                    className="btn2"
                    disabled={busy === row.id}
                    onClick={() => resolve(row, "dismissed")}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
