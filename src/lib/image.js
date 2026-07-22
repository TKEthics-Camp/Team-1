import { useEffect, useState } from "react";

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
