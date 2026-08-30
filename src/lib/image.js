import { useEffect, useState } from "react";
import { downloadPhotoBlob } from "./remote";

export function downscale(file, max, cb) {
  var url = URL.createObjectURL(file);
  var img = new Image();
  img.onload = function () {
    var scale = Math.min(1, max / Math.max(img.width, img.height));
    if (scale === 1) { URL.revokeObjectURL(url); return cb(file); }
    var c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    c.toBlob(function (b) { URL.revokeObjectURL(url); cb(b || file); }, "image/jpeg", 0.82);
  };
  img.onerror = function () { URL.revokeObjectURL(url); cb(file); };
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
    if (!storagePath) { setUrl(null); return; }
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
