import { useEffect, useState } from "react";
import { downloadPhotoBlob, downloadAudioBlob } from "./remote";

// Nothing bigger than this is worth decoding: it's a phone photo or it's a
// mistake, and the decode itself is what would hang a cheap device.
export const MAX_PICK_BYTES = 25 * 1024 * 1024;

// Turns a picked file into something safe to store and show: size-capped,
// actually decodable, scaled to `max` on the long edge, and always
// re-encoded as JPEG. Calls back (blob, null) or (null, reasonKey).
//
// The re-encode is unconditional on purpose. This used to hand the original
// file straight back whenever it was already small enough, or whenever the
// decode failed — so a HEIC straight off an iPhone (small, and undecodable
// outside Safari) went up untouched and then rendered as a broken image for
// everyone else. Anything that reaches the callback here has been through a
// canvas, which means the browser could read it and every other browser can
// read what came out.
export function prepareImage(file, max, cb) {
  if (!file) return cb(null, "photoUnreadable");
  if (file.size > MAX_PICK_BYTES) return cb(null, "photoTooBig");

  var url = URL.createObjectURL(file);
  var img = new Image();
  img.onload = function () {
    URL.revokeObjectURL(url);
    var scale = Math.min(1, max / Math.max(img.width, img.height));
    var c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.width * scale));
    c.height = Math.max(1, Math.round(img.height * scale));
    var ctx = c.getContext("2d");
    // JPEG has no alpha, so anything transparent would flatten to black
    // without this — screenshots and exported drawings, mostly.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    // toBlob yields null when the canvas is past the browser's size limit,
    // which is the one failure that survives a successful decode.
    c.toBlob(function (b) { cb(b || null, b ? null : "photoUnreadable"); }, "image/jpeg", 0.82);
  };
  img.onerror = function () { URL.revokeObjectURL(url); cb(null, "photoUnreadable"); };
  img.src = url;
}

// Creates an object URL for a blob and revokes it on unmount or when the blob changes.
export function useObjectURL(blob) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!blob) { setUrl(null); return; }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

// Same as useObjectURL, but for a synced photo record that might not have
// its bytes on this device yet — someone else's photo, or your own on a
// device that hasn't downloaded it. Uses the local blob when there is one
// (instant, no network); otherwise fetches it from Storage via
// storagePath. onDownloaded (optional) is how a caller with somewhere to
// cache the result — see AlbumTab/PhotoViewer caching a downloaded blob
// back to Dexie for your own photos — finds out a fetch actually happened.
export function usePhotoURL(photo, onDownloaded) {
  const blob = photo && photo.blob;
  const storagePath = photo && photo.storagePath;
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (blob) {
      const u = URL.createObjectURL(blob);
      setUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    if (!storagePath) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    let objectUrl = null;
    downloadPhotoBlob(storagePath).then((fetched) => {
      if (cancelled || !fetched) return;
      objectUrl = URL.createObjectURL(fetched);
      setUrl(objectUrl);
      if (onDownloaded) onDownloaded(fetched);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob, storagePath]);

  return url;
}

// Same idea as usePhotoURL, for an entry's voice note: use the local blob
// when there is one, otherwise fetch it from Storage via audioPath — a
// recording made on another device, or this one after a sign-out wiped
// local storage.
export function useAudioURL(entry, onDownloaded) {
  const blob = entry && entry.audio;
  const storagePath = entry && entry.audioPath;
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (blob) {
      const u = URL.createObjectURL(blob);
      setUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    if (!storagePath) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    let objectUrl = null;
    downloadAudioBlob(storagePath).then((fetched) => {
      if (cancelled || !fetched) return;
      objectUrl = URL.createObjectURL(fetched);
      setUrl(objectUrl);
      if (onDownloaded) onDownloaded(fetched);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob, storagePath]);

  return url;
}
