import { useEffect, useState } from "react";
import { moderationQueue, moderateHide, moderateResolve, downloadPhotoBlob, downloadAudioBlob, crashDigest } from "../../lib/remote";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";

// The reported photo or voice note itself. Storage lets a moderator read a
// file only while a report on it is open (20261011010000), so this asks for
// it when the row is drawn and lets go of it when the row goes away.
function ReportedMedia({ kind, path }) {
  const [url, setUrl] = useState(/** @type {string | null} */ (null));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;
    const fetchBlob = kind === "photo" ? downloadPhotoBlob : downloadAudioBlob;
    fetchBlob(path).then((blob) => {
      if (cancelled) return;
      if (!blob) { setFailed(true); return; }
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [kind, path]);

  if (failed) return <div className="mod-media"><em>(couldn't load the file)</em></div>;
  if (!url) return <div className="mod-media"><em>Loading the file…</em></div>;
  return (
    <div className="mod-media">
      {kind === "photo"
        ? <img src={url} alt="The reported photo" />
        : <audio controls src={url} />}
    </div>
  );
}

// The other end of the report button.
//
// Deliberately plain and deliberately fast: the whole reason reports went
// unread was that reading them was impossible, and the next worst thing is
// making it tedious. Every report arrives with the reported text already
// attached — and the photo or voice note, if that is what was reported — so
// a decision takes one look and one tap.
//
// English only, on purpose. This is a staff tool for whoever is named
// responsible for the app, not a screen any student will ever open — and
// pretending otherwise by translating it would suggest it is part of the
// product.
export default function ModerationScreen() {
  const [rows, setRows] = useState(/** @type {any[] | null} */ (null));
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [busy, setBusy] = useState(/** @type {string | null} */ (null));
  const [crashes, setCrashes] = useState(/** @type {any[] | null} */ (null));

  useEffect(() => {
    let cancelled = false;
    crashDigest().then((result) => { if (!cancelled) setCrashes(result.rows); });
    return () => { cancelled = true; };
  }, []);

  async function load() {
    const result = await moderationQueue();
    if (!result.ok) { setError(result.message || null); setRows([]); return; }
    setError(null);
    setRows(result.rows);
  }

  useEffect(() => { load(); }, []);

  async function hide(row, hidden) {
    setBusy(row.id);
    const result = await moderateHide(row.target_type, row.target_id, hidden);
    setBusy(null);
    if (!result.ok) { setError(result.message || null); return; }
    load();
  }

  async function resolve(row, status) {
    setBusy(row.id);
    const result = await moderateResolve(row.id, status);
    setBusy(null);
    if (!result.ok) { setError(result.message || null); return; }
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

                {/* The reported words themselves. A moderator deciding
                    without seeing them is guessing. */}
                {row.media_path && (
                  <ReportedMedia
                    kind={row.target_type === "photo" ? "photo" : "audio"}
                    path={row.media_path}
                  />
                )}
                {(row.content || !row.media_path) && (
                  <div className="mod-content">
                    {row.content ? row.content : <em>(nothing left to show — it may have since been deleted)</em>}
                  </div>
                )}

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

        <Crashes rows={crashes} />
      </div>
    </>
  );
}

// What crashed in the last 14 days (lib/crashReport), most recent first.
// Grouped by the error and the screen, so one bug hitting a whole class is
// one row with a count, not thirty. Never says who: a crash is fixed from
// the stack, not by asking the student.
function Crashes({ rows }) {
  if (!rows) return null;
  return (
    <>
      <h2 className="mod-section">Crashes · last 14 days</h2>
      {rows.length === 0 ? (
        <div className="sub">None. Nothing has crashed for anyone.</div>
      ) : rows.map((c) => (
        <div key={c.message + "|" + c.where} className="mod-row">
          <div className="mod-head">
            <span className="mod-kind">{c.where || "unknown screen"}</span>
            <span className="mod-when">{new Date(c.last_at).toLocaleString()}</span>
          </div>
          <div className="mod-content">{c.message}</div>
          <div className="mod-by">
            {c.times} {c.times === 1 ? "time" : "times"}, {c.accounts} {c.accounts === 1 ? "account" : "accounts"}
            {c.platforms && c.platforms.length ? " · " + c.platforms.join(", ") : ""}
            {c.version ? " · " + c.version : ""}
          </div>
          {c.stack && (
            <details className="mod-stack">
              <summary>Stack</summary>
              <pre>{c.stack}</pre>
            </details>
          )}
        </div>
      ))}
    </>
  );
}
