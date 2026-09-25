import { Capacitor } from "@capacitor/core";

// Hands a finished file to the person, on whichever platform this is.
//
// In a browser that is a download. Inside the iPhone app it cannot be: a
// WebView silently ignores <a download>, so the file is written to the app's
// cache and offered through the share sheet, which is how an iPhone user
// expects to save something — to Files, to AirDrop, to email.
export async function saveFile(blob, filename) {
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const data = await blobToBase64(blob);
    const written = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache });
    await Share.share({ title: filename, files: [written.uri] });
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked on the next tick, not immediately: some browsers start the
  // download asynchronously and an already-revoked URL downloads nothing.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
