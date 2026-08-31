import { useCallback, useEffect, useRef, useState } from "react";

// Picks a container the browser will actually record in. Safari only does
// mp4/aac; Chrome and Firefox do webm. Passing an unsupported mimeType to
// MediaRecorder throws, and passing none leaves Safari recording something
// it then can't always play back, so this asks first.
function pickMime() {
  if (typeof MediaRecorder === "undefined") return null;
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return options.find((m) => MediaRecorder.isTypeSupported(m)) || "";
}

export const canRecord = () =>
  typeof MediaRecorder !== "undefined" &&
  typeof navigator !== "undefined" &&
  !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

// A voice note recorder. Returns a Blob, not a URL — the caller stores it in
// Dexie beside the entry, the same way photos are stored.
//
// The stream is stopped on every exit path (stop, cancel, unmount). A live
// getUserMedia stream keeps the browser's recording indicator lit and, on
// mobile, holds the mic open against other apps, so leaking one is not a
// tidiness problem but a visible one.
export function useRecorder() {
  const [state, setState] = useState("idle"); // idle | recording | denied | unsupported
  const [ms, setMs] = useState(0);
  const recRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const tickRef = useRef(null);
  const resolveRef = useRef(null);

  const release = useCallback(() => {
    clearInterval(tickRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recRef.current = null;
  }, []);

  useEffect(() => release, [release]);

  const start = useCallback(async () => {
    if (!canRecord()) { setState("unsupported"); return false; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        release();
        setState("idle");
        const done = resolveRef.current;
        resolveRef.current = null;
        if (done) done(blob.size ? blob : null);
      };
      recRef.current = rec;
      rec.start();
      setMs(0);
      const began = Date.now();
      tickRef.current = setInterval(() => setMs(Date.now() - began), 200);
      setState("recording");
      return true;
    } catch (err) {
      release();
      // NotAllowedError is a refused permission; anything else (no mic at
      // all, hardware in use) is reported the same way — the user's next
      // move is identical either way.
      setState(err && err.name === "NotAllowedError" ? "denied" : "unsupported");
      return false;
    }
  }, [release]);

  // Resolves with the recorded Blob, or null if nothing was captured.
  const stop = useCallback(() => new Promise((resolve) => {
    const rec = recRef.current;
    if (!rec || rec.state === "inactive") { resolve(null); return; }
    resolveRef.current = resolve;
    rec.stop();
  }), []);

  const cancel = useCallback(() => {
    const rec = recRef.current;
    resolveRef.current = null;
    if (rec && rec.state !== "inactive") { rec.onstop = null; rec.stop(); }
    release();
    setState("idle");
    setMs(0);
  }, [release]);

  return { state, ms, start, stop, cancel, recording: state === "recording" };
}

export function fmtClock(ms) {
  const total = Math.floor(ms / 1000);
  return Math.floor(total / 60) + ":" + String(total % 60).padStart(2, "0");
}
